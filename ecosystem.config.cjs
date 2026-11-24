module.exports = {
	apps: [
		{
			name: 'sprogeny',
			script: './build/index.js',
			node_args: '--env-file=/etc/sprogeny/env',
			instances: 1,
			autorestart: true,
			max_memory_restart: '512M',
			log_date_format: 'YYYY-MM-DD HH:mm:ss',
			error_file: '/var/log/sprogeny/error.log',
			out_file: '/var/log/sprogeny/app.log',
			merge_logs: true,
			exec_mode: 'fork'
		}
	]
};
