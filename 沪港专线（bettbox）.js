var Compatible_With_Bettbox = {
  ruleOptionsEnable: true
};

function main(config) {
  // 1. 安全性检查（禁用 ! 符号，改用显式判断）
  if (config === null || config === undefined) {
    return config;
  }
  if (config.proxies === null || config.proxies === undefined || Array.isArray(config.proxies) === false) {
    return config;
  }

  var targetNodeName = "nnb沪港";
  var groupName = "沪港专线";

  // Mieru 前置节点（已严格按照图片修正密码）
  var frontNode = {
    name: targetNodeName,
    type: "mieru",
    server: "",
    port: 8250,
    transport: "TCP",
    udp: true,
    username: "",
    password: "",
    multiplexing: "MULTIPLEXING_OFF",
    mtu: 1400
  };

  var blackListNames = [
    "移动专线",
    "沪日专线",
    targetNodeName
  ];

  var systemKeywords = ["DIRECT", "REJECT"];

  // ==========================================
  // 1. 添加或更新 nnb沪港 前置节点
  // ==========================================
  var frontIndex = -1;
  for (var i = 0; i < config.proxies.length; i++) {
    if (config.proxies[i] && config.proxies[i].name === targetNodeName) {
      frontIndex = i;
      break;
    }
  }

  if (frontIndex >= 0) {
    // 降级 ES5：不使用 ... 展开运算符，逐个属性覆盖
    var existingNode = config.proxies[frontIndex];
    for (var key in frontNode) {
      if (frontNode.hasOwnProperty(key)) {
        existingNode[key] = frontNode[key];
      }
    }
  } else {
    config.proxies.unshift(frontNode);
  }

  // ==========================================
  // 2. 清理本脚本以前生成的链式节点（防止重复）
  // ==========================================
  var cleanProxies = [];
  for (var i = 0; i < config.proxies.length; i++) {
    var p = config.proxies[i];
    if (p && typeof p.name === "string") {
      // 过滤掉以 "nnb沪港 -> " 开头的旧链式节点
      if (p.name.indexOf(targetNodeName + " -> ") !== 0) {
        cleanProxies.push(p);
      }
    } else if (p) {
      cleanProxies.push(p);
    }
  }
  config.proxies = cleanProxies;

  // ==========================================
  // 3. 生成全新的链式落地节点
  // ==========================================
  var chainedProxies = [];
  var allowedChainNames = [];

  for (var i = 0; i < config.proxies.length; i++) {
    var proxy = config.proxies[i];
    if (proxy && typeof proxy.name === "string") {
      var name = proxy.name;
      var upperName = name.toUpperCase();

      // 系统关键字过滤
      var isSystem = false;
      for (var j = 0; j < systemKeywords.length; j++) {
        if (upperName.indexOf(systemKeywords[j]) !== -1) {
          isSystem = true;
          break;
        }
      }

      // 黑名单过滤
      var isBlackList = false;
      for (var k = 0; k < blackListNames.length; k++) {
        if (name === blackListNames[k]) {
          isBlackList = true;
          break;
        }
      }

      if (isSystem === false && isBlackList === false) {
        var chainedName = targetNodeName + " -> " + name;
        allowedChainNames.push(chainedName);

        // 复制原节点属性并改写为链式代理节点
        var chainedProxy = {};
        for (var attr in proxy) {
          if (proxy.hasOwnProperty(attr)) {
            chainedProxy[attr] = proxy[attr];
          }
        }
        chainedProxy.name = chainedName;
        chainedProxy["dialer-proxy"] = targetNodeName;
        chainedProxy.url = "";
        chainedProxy.interval = 0;

        chainedProxies.push(chainedProxy);
      }
    }
  }

  // 追加新生成的链式节点
  config.proxies = config.proxies.concat(chainedProxies);

  // ==========================================
  // 4. 创建或更新「沪港专线」策略组
  // ==========================================
  if (Array.isArray(config["proxy-groups"]) === false) {
    config["proxy-groups"] = [];
  }

  var groups = config["proxy-groups"];
  var groupIndex = -1;
  for (var i = 0; i < groups.length; i++) {
    if (groups[i] && groups[i].name === groupName) {
      groupIndex = i;
      break;
    }
  }

  var newGroup = {
    name: groupName,
    type: "select",
    proxies: allowedChainNames
  };

  if (groupIndex >= 0) {
    groups[groupIndex] = newGroup;
  } else {
    groups.push(newGroup);
  }

  // ==========================================
  // 5. 重新整合 PROXY / GLOBAL 组的置顶顺序
  //    目标顺序：DIRECT -> 沪港专线 -> nnb沪港 -> 剩余节点
  // ==========================================
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    if (group && (group.name === "PROXY" || group.name === "GLOBAL")) {
      if (Array.isArray(group.proxies) === false) {
        group.proxies = [];
      }

      // 过滤掉旧的特殊节点名，防止重复
      var updated = [];
      for (var m = 0; m < group.proxies.length; m++) {
        var pName = group.proxies[m];
        if (pName !== groupName && pName !== targetNodeName && pName !== "DIRECT") {
          updated.push(pName);
        }
      }

      // 严格按顺序置顶插入
      updated.unshift(targetNodeName); // 3. nnb沪港
      updated.unshift(groupName);      // 2. 沪港专线
      updated.unshift("DIRECT");       // 1. DIRECT

      group.proxies = updated;
    }
  }

  return config;
}
