import type { UserConfigExport } from "@tarojs/cli"

export default {
    logger: {
        quiet: false,
        stats: true
    },
    /** Webpack 持久化缓存，加快 dev 二次编译 */
    cache: {
        enable: true
    },
    mini: {},
    h5: {
        devServer: {
            /** 允许局域网设备访问（如手机调试 10.x.x.x:10086） */
            host: '0.0.0.0',
            /** 模块热替换（配合 babel react-refresh，保存后组件级更新） */
            hot: true,
            /** 同源代理到 yi-back-end，避免 H5 与 8000 端口跨域、localhost/127 混用问题 */
            proxy: {
                "/api": {
                    target: "/api",
                    changeOrigin: true
                }
            }
        }
    }
} satisfies UserConfigExport<'webpack5'>
