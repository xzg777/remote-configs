const Compatible_With_Bettbox = { ruleOptionsEnable: true };

function main(config) {
  if (!config.proxies || !Array.isArray(config.proxies)) return config;

  const targetNodeName = 'hk-专线';
  
  // 核心修正：明確指定要完全排除的「黑名單節點名稱」
  const blackListNames = ['移动专线', '沪日专线', targetNodeName];
  // 系統級內置策略排除關鍵字
  const systemKeywords = ['DIRECT', 'REJECT'];

  // 驗證前置專線是否存在
  const hasFrontProxy = config.proxies.some(p => p.name === targetNodeName);
  if (!hasFrontProxy) return config;

  let chainedProxies = [];
  let allowedChainNames = [];

  // ==========================================
  // 1. 遍歷並生成鏈式代理（精準排除黑名單）
  // ==========================================
  config.proxies = config.proxies.map(proxy => {
    // 檢查是否命中系統內置策略
    const isSystem = systemKeywords.some(keyword => proxy.name.toUpperCase().includes(keyword.toUpperCase()));
    // 檢查是否命中名字完全相同的黑名單（精準匹配，防止把移動專線誤當落地）
    const isBlackList = blackListNames.includes(proxy.name);

    if (!isSystem && !isBlackList) {
      const chainedName = `${targetNodeName} -> ${proxy.name}`;
      allowedChainNames.push(chainedName); 

      // 生成鏈式節點，並強行關閉其測速與定時檢查
      chainedProxies.push({
        ...proxy,
        name: chainedName,
        'dialer-proxy': targetNodeName,
        'url': '',          
        'interval': 0       
      });

      // 如果是家寬節點，主動降低它本身的測速頻率，防止並行測速超時
      if (proxy.name.includes('家宽')) {
        return {
          ...proxy,
          'interval': 0 
        };
      }
    }
    return proxy;
  });

  // 追加鏈式節點到總清單末尾
  config.proxies = config.proxies.concat(chainedProxies);

  // ==========================================
  // 2. 建立獨立的「ixp专线」策略組
  // ==========================================
  if (config['proxy-groups'] && Array.isArray(config['proxy-groups'])) {
    
    const newGroup = {
      name: 'ixp专线',
      type: 'select', 
      proxies: allowedChainNames
    };

    config['proxy-groups'].push(newGroup);

    config['proxy-groups'] = config['proxy-groups'].map(group => {
      if (group.name === 'PROXY' || group.name === 'GLOBAL') {
        let updatedProxies = [...group.proxies];
        
        if (!updatedProxies.includes('ixp专线')) {
          updatedProxies.unshift('ixp专线'); 
        }
        
        // 確保 DIRECT 永遠排在最前面
        updatedProxies = updatedProxies.filter(name => name !== 'DIRECT');
        updatedProxies.unshift('DIRECT');
        
        return {
          ...group,
          proxies: updatedProxies
        };
      }
      return group;
    });
  }

  return config;
}
