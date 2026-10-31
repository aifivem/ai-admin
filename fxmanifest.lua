name 'ai-admin'
author 'TGIANN'
version '0.2.0' -- x-release-please-version
license 'GPL-3.0-only'
description 'Admin tools: noclip, teleports, heal and revive, vehicles, announcements and a quick admin menu'
repository 'https://github.com/aifivem/ai-admin'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/settings.json',
}
