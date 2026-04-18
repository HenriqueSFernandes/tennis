interface DeviceInfo {
  browser: string;
  os: string;
  isMobile: boolean;
}

const BROWSER_MAP: Record<string, string> = {
  Edg: "Edge",
  Chrome: "Chrome",
  Firefox: "Firefox",
  Safari: "Safari",
  Opera: "Opera",
  IE: "Internet Explorer",
  OP: "Opera",
  MiuiBrowser: "Mi Browser",
  HuaweiBrowser: "Huawei Browser",
  SamsungBrowser: "Samsung Browser",
};

const OS_MAP: Record<string, string> = {
  Windows: "Windows",
  Mac: "macOS",
  iPhone: "iOS",
  iPad: "iPadOS",
  Android: "Android",
  Linux: "Linux",
  ChromeOS: "Chrome OS",
};

function getBrowser(userAgent: string): string {
  for (const [key, value] of Object.entries(BROWSER_MAP)) {
    if (userAgent.includes(key)) {
      return value;
    }
  }
  return "Browser Desconhecido";
}

function getOS(userAgent: string): string {
  for (const [key, value] of Object.entries(OS_MAP)) {
    if (userAgent.includes(key)) {
      return value;
    }
  }
  return "Sistema Desconhecido";
}

function isMobileDevice(userAgent: string): boolean {
  const mobileKeywords = [
    "Mobile",
    "Android",
    "iPhone",
    "iPad",
    "iPod",
    "Windows Phone",
  ];
  return mobileKeywords.some((keyword) => userAgent.includes(keyword));
}

export function parseUserAgent(userAgent: string): DeviceInfo {
  return {
    browser: getBrowser(userAgent),
    os: getOS(userAgent),
    isMobile: isMobileDevice(userAgent),
  };
}

export function getDeviceDisplayName(userAgent: string): string {
  const info = parseUserAgent(userAgent);

  return `${info.browser} em ${info.os}`;
}
