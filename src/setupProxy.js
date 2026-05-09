const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
	// Single proxy for all backend routes (do not also set "proxy" in package.json — that duplicates HPM and doubles errors).
	const backend = 'http://127.0.0.1:3001';

	app.use(
		['/api', '/docusign/auth'],
		createProxyMiddleware({
			target: backend,
			changeOrigin: true,
			secure: false,
			logLevel: 'warn',
			timeout: 60000,
			proxyTimeout: 60000,
			onProxyReq: (proxyReq) => {
				proxyReq.setHeader('Connection', 'keep-alive');
			},
			onError: (err, req, res) => {
				console.error('Proxy error:', err.message);
				if (!res.headersSent) {
					res.status(504).json({
						error: 'Gateway timeout',
						message:
							'The backend server took too long to respond. Please try again.',
					});
				}
			},
		})
	);
};
