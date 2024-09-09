#!/usr/bin/bash
NAME=ft_transcendence
CFCONFIG=cloudflared/config.yml

if ! command -v lolcat &> /dev/null
then
	lolcat() {
		if [[ $1 = "-a" ]]; then
			cat $2
		else
			cat $1
		fi
	}
fi

clear
<< '__SPLASH__' lolcat -a
███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████
 _________  ________  ________  ________   ________  ________  _______   ________   ________          ___   ___    _______     
|\___   ___|\   __  \|\   __  \|\   ___  \|\   ____\|\   ____\|\  ___ \ |\   ___  \|\   ___ \        |\  \ |\  \  /  ___  \    
\|___ \  \_\ \  \|\  \ \  \|\  \ \  \\ \  \ \  \___|\ \  \___|\ \   __/|\ \  \\ \  \ \  \_|\ \       \ \  \\_\  \/__/|_/  /|   
     \ \  \ \ \   _  _\ \   __  \ \  \\ \  \ \_____  \ \  \    \ \  \_|/_\ \  \\ \  \ \  \ \\ \       \ \______  |__|//  / /   
      \ \  \ \ \  \\  \\ \  \ \  \ \  \\ \  \|____|\  \ \  \____\ \  \_|\ \ \  \\ \  \ \  \_\\ \       \|_____|\  \  /  /_/__  
       \ \__\ \ \__\\ _\\ \__\ \__\ \__\\ \__\____\_\  \ \_______\ \_______\ \__\\ \__\ \_______\             \ \__\|\________\
        \|__|  \|__|\|__|\|__|\|__|\|__| \|__|\_________\|_______|\|_______|\|__| \|__|\|_______|              \|__| \|_______|
                                             \|_________|                                                                      

███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████

__SPLASH__

announce() {
	sleep 1
	echo ">> $1 <<" | lolcat -a
	echo
}

prompt() {
	read -p "  ==>  $1" $2
	echo
}

next_chapter() {
	sleep 3
	clear
	announce "███████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████"
	announce "$1"
}

announce "Welcome to the $NAME setup wizard."
announce "Follow my wise guidance and thou shalt be rewarded with $NAME "
announce "Answer my questions truthfully or face the dire consequences."
announce "Let us begin."
read -p "Enter now if you accept the challenge. (press enter to continue) "

next_chapter "First, we must know the unknown."
sleep 2
prompt "Do you wish to deploy to production? (yespls[default]/nowei): " DEPLOY
if [[ "${DEPLOY}" != "nowei" ]]; then
	DEPLOY="yespls"
	announce "You have chosen to deploy to production. Brave! May the bytes have mercy on your host."
	prompt "Desired domain name (e.g. awe.some.com): " DOMAIN
	announce "As you desire, your domain shall be known as $DOMAIN (you better own it or else...)"
	announce "To reach your farflung domain, we must build a magnificent tunnel."
	sleep 2
	prompt "Cloudflare tunnel token: " CLOUDFLARE_TUNNEL_TOKEN
	prompt "Tunnel ID: " TUNNEL_ID
	announce "With the power of Cloudflare, we shall travel to $DOMAIN."
	sleep 2
else
	DEPLOY=""
	CLOUDFLARE_TUNNEL_TOKEN=""
	TUNNEL_ID=""
	DOMAIN="localhost"
	announce "Sure, let's keep it lowkey. We shall deploy in the shadows of $DOMAIN."
fi

next_chapter "Next, you must keep the records straight."
sleep 2
prompt "Database name: " POSTGRES_DB
prompt "Database user: " POSTGRES_USER
if ! command -v openssl &> /dev/null
then
	prompt "Database password: " POSTGRES_PASSWORD
else
	prompt "Database password: (leave empty to autogenerate) " POSTGRES_PASSWORD
	if [[ -z "${POSTGRES_PASSWORD}" ]]; then
		POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-24)
		announce "A glorious password has been forged for you: ${POSTGRES_PASSWORD}"
	fi
fi
announce "With this, we shall build a grandiose postgres of data."
sleep 2

next_chapter "Beware, the realm beyond the firewall is treacherous."
announce "We must fortify our champion Django with a powerful secret."
sleep 2
prompt "Set Django's secret key: " DJANGO_SECRET_KEY #TODO: maybe also auto generate this
DJANGO_ALLOWED_HOSTS="${DOMAIN}"
DJANGO_TRUSTED_ORIGINS="https://${DOMAIN}"
announce "Django is grateful for you hospitality and will trust ${DJANGO_TRUSTED_ORIGINS} origins."
sleep 2

next_chapter "Fortunes have no worth without friends to share them with."
announce "Oh, auth! If you can summon it, the whole network will be yours."
sleep 2
prompt "What will be thy OAuth client id: " CLIENT_ID
prompt "What will it be, its secret key: " CLIENT_SECRET
REDIRECT_URI="https://${DOMAIN}/redirect"
announce "Thus, the lost 42 souls shall be guided to ${REDIRECT_URI} to find their way."
sleep 2

next_chapter "The final step is to forge the chains that will bind the realm."
announce "You must own the key to the hardhat kingdom."
sleep 2
prompt "Set the blockchain key: " HARDHAT_PRIVATE_KEY
sleep 2

next_chapter "The ritual is complete. ${NAME} shall rise from the containers."
announce "This shall be your .env file:"

export DOTENV=$(cat <<__EOF__
# Server
DEPLOY=${DEPLOY}
DOMAIN=${DOMAIN}
CLOUDFLARE_TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
TUNNEL_ID=${TUNNEL_ID}
# Postgres Database
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
# Django
DJANGO_SECRET_KEY=${DJANGO_SECRET_KEY}
DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS}
DJANGO_TRUSTED_ORIGINS=${DJANGO_TRUSTED_ORIGINS}
# OAuth
CLIENT_ID=${CLIENT_ID}
CLIENT_SECRET=${CLIENT_SECRET}
REDIRECT_URI=${REDIRECT_URI}
# Blockchain
HARDHAT_PRIVATE_KEY=${HARDHAT_PRIVATE_KEY}
__EOF__
)

clear
echo "${DOTENV}" | lolcat -a
read -p "Enter if you agree to this arrangement or begone! (press enter to continue, Ctrl+C to cancel) "

next_chapter "The time has come to transcend this mortal realm."
if [[ "${DEPLOY}" == "yespls" ]]; then
	if [[ ! -f ${CFCONFIG} ]]; then
		announce "Woe! The Cloudflare tunnel construction plan is missing. Come back when you have it."
		exit 1
	fi
	sed -i "s/<TUNNEL-ID>/${TUNNEL_ID}/g" ${CFCONFIG}
	sed -i "s/<DOMAIN>/${DOMAIN}/g" ${CFCONFIG}
fi

announce "Enchanting your .env invocation..."
echo "${DOTENV}" > .env

announce "Go forth and summon the ${NAME} to this world!"
sleep 5
clear
