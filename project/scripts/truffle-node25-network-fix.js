const os = require("os");

const originalNetworkInterfaces = os.networkInterfaces.bind(os);

os.networkInterfaces = function patchedNetworkInterfaces() {
  try {
    return originalNetworkInterfaces();
  } catch (error) {
    if (error && error.code === "ERR_SYSTEM_ERROR") {
      return {
        lo: [
          {
            address: "127.0.0.1",
            netmask: "255.0.0.0",
            family: "IPv4",
            mac: "00:00:00:00:00:00",
            internal: true,
            cidr: "127.0.0.1/8",
          },
        ],
      };
    }

    throw error;
  }
};
