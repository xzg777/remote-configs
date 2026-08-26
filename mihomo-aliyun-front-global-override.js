// Mihomo / Clash.Meta global override script.
//
// Version 3 behavior:
// 1. Only runs when the exact node name "阿里云中转" exists in the current config.
// 2. Builds an "阿里云前置" group for all eligible landing nodes except the Aliyun transit node itself.
// 3. Builds a custom "自定义VLESS前置" group for VLESS landing nodes only.
// 4. The custom VLESS front skips the Aliyun transit node and same-machine nodes.
// 5. Chained copies force IPv4 and skip literal IPv6 landing addresses.
// 6. Chained proxy names stay visually identical to the source names by using invisible markers.
//
// Change CUSTOM_VLESS_FRONT_NODE_NAMES to your preferred custom VLESS front node(s).

const FRONT_NODE_NAMES = ["阿里云中转"];
const CUSTOM_VLESS_FRONT_NODE_NAMES = ["酷网-香港"];
const INSERT_TO_GROUPS = ["PROXY", "Proxy", "GLOBAL"];
const CHAIN_IP_VERSION = "ipv4";
const TRAILING_NODE_INDEX_RE = /(?:[-_\s·.]?\d+)+$/u;

const FRONT_SETUPS = [
  {
    frontNodeNames: FRONT_NODE_NAMES,
    poolGroupName: "__阿里云前置池",
    chainGroupName: "阿里云前置",
    chainNameMarker: "\u2063",
    targetTypes: null,
    skipSameMachine: false,
    excludeNodeNames: FRONT_NODE_NAMES,
  },
  {
    frontNodeNames: CUSTOM_VLESS_FRONT_NODE_NAMES,
    poolGroupName: "__自定义VLESS前置池",
    chainGroupName: "自定义VLESS前置",
    chainNameMarker: "\u2063\u2063",
    targetTypes: ["vless"],
    skipSameMachine: true,
    excludeNodeNames: FRONT_NODE_NAMES,
  },
];

function main(config) {
  const nextConfig = config || {};
  const proxies = Array.isArray(nextConfig.proxies) ? nextConfig.proxies : [];
  const proxyGroups = Array.isArray(nextConfig["proxy-groups"]) ? nextConfig["proxy-groups"] : [];

  if (!proxies.length) {
    return nextConfig;
  }

  if (!proxies.some(proxy => isFrontNode(proxy && proxy.name, FRONT_NODE_NAMES))) {
    return nextConfig;
  }

  nextConfig.proxies = proxies.filter(proxy => {
    const name = proxy && proxy.name;
    return name && !isGeneratedChainProxy(name);
  });

  nextConfig["proxy-groups"] = proxyGroups.filter(group => {
    const name = group && group.name;
    return name && !isGeneratedChainGroup(name);
  });

  const baseProxies = nextConfig.proxies;
  const baseGroups = nextConfig["proxy-groups"];
  const appendedProxies = [];
  const appendedGroups = [];
  const insertedGroupNames = [];

  for (const setup of FRONT_SETUPS) {
    const activeFrontNodes = baseProxies.filter(proxy => isFrontNode(proxy && proxy.name, setup.frontNodeNames));
    if (!activeFrontNodes.length) {
      continue;
    }

    const activeFrontNames = unique(activeFrontNodes.map(proxy => proxy.name));
    const excludedNames = unique([].concat(setup.excludeNodeNames || [], activeFrontNames));
    const frontMachineKeys = setup.skipSameMachine ? unique(activeFrontNames.map(getMachineKey)) : [];

    const chainCandidates = baseProxies.filter(proxy => shouldChainProxy(proxy, setup, excludedNames, frontMachineKeys));
    if (!chainCandidates.length) {
      continue;
    }

    const chainedProxies = chainCandidates.map(proxy => buildChainedProxy(proxy, setup));
    const chainProxyNames = chainedProxies.map(proxy => proxy.name);

    appendedProxies.push(...chainedProxies);
    appendedGroups.push({
      name: setup.poolGroupName,
      type: "select",
      proxies: activeFrontNames,
      hidden: true,
    });
    appendedGroups.push({
      name: setup.chainGroupName,
      type: "select",
      proxies: chainProxyNames,
    });
    insertedGroupNames.push(setup.chainGroupName);
  }

  if (!appendedProxies.length) {
    return nextConfig;
  }

  nextConfig.proxies = baseProxies.concat(appendedProxies);
  nextConfig["proxy-groups"] = baseGroups.concat(appendedGroups);

  for (const group of nextConfig["proxy-groups"]) {
    if (!group || !INSERT_TO_GROUPS.includes(group.name)) {
      continue;
    }

    group.proxies = Array.isArray(group.proxies) ? group.proxies : [];
    for (const insertedGroupName of insertedGroupNames.slice().reverse()) {
      if (!group.proxies.includes(insertedGroupName)) {
        group.proxies.unshift(insertedGroupName);
      }
    }
  }

  return nextConfig;
}

function buildChainedProxy(proxy, setup) {
  const chained = deepClone(proxy);
  chained.name = makeChainName(proxy.name, setup.chainNameMarker);
  chained["dialer-proxy"] = setup.poolGroupName;
  chained["ip-version"] = CHAIN_IP_VERSION;
  delete chained.interface;
  return chained;
}

function shouldChainProxy(proxy, setup, excludedNames, frontMachineKeys) {
  if (!proxy || !proxy.name || !proxy.type) {
    return false;
  }

  if (excludedNames.includes(proxy.name)) {
    return false;
  }

  if (isGeneratedChainProxy(proxy.name)) {
    return false;
  }

  if (isLiteralIPv6(proxy.server)) {
    return false;
  }

  const type = String(proxy.type).toLowerCase();
  if (Array.isArray(setup.targetTypes) && setup.targetTypes.length && !setup.targetTypes.includes(type)) {
    return false;
  }

  if (type === "direct" || type === "reject" || type === "pass") {
    return false;
  }

  if (setup.skipSameMachine) {
    const proxyMachineKey = getMachineKey(proxy.name);
    if (proxyMachineKey && frontMachineKeys.includes(proxyMachineKey)) {
      return false;
    }
  }

  return true;
}

function isFrontNode(name, frontNodeNames) {
  return Array.isArray(frontNodeNames) && frontNodeNames.includes(name);
}

function isGeneratedChainProxy(name) {
  return typeof name === "string" && FRONT_SETUPS.some(setup => name.endsWith(setup.chainNameMarker));
}

function isGeneratedChainGroup(name) {
  return FRONT_SETUPS.some(setup => name === setup.poolGroupName || name === setup.chainGroupName);
}

function makeChainName(name, marker) {
  return `${name}${marker}`;
}

function getMachineKey(name) {
  if (typeof name !== "string") {
    return "";
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }

  const withoutIndex = trimmed.replace(TRAILING_NODE_INDEX_RE, "").trim();
  return (withoutIndex || trimmed).toLowerCase();
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function isLiteralIPv6(server) {
  return typeof server === "string" && server.includes(":") && !server.includes(".");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
