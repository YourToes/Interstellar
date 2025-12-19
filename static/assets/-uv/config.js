self.__uv$config = {
  prefix: "/a/",
  bare: "/ov/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/assets/-uv/handler.js?v=6-17-2024",
  bundle: "/assets/-uv/bundle.js?v=6-17-2024",
  config: "/assets/-uv/config.js?v=6-17-2024",
  sw: "/assets/-uv/sw.js?v=6-17-2024",
  // Ensure nested iframes are hooked
  construct: function(UV, type) {
    // This ensures UV hooks into nested iframes properly
    if (type === "window") {
      // Force UV to hook into all iframes
      UV.meta.iframe = true;
    }
  }
}
