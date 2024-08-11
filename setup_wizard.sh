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
	echo ">> $1 <<" | lolcat
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
read -p "Enter now if you accept the challenge."

next_chapter "First, we must know the unknown."
sleep 2
prompt "Desired domain name (e.g. awe.some.com): " DOMAIN
announce "As you desire, your domain shall be known as $DOMAIN (you better own it or else...)"
announce "To reach your farflung domain, we must build a magnificent tunnel."
sleep 2
prompt "Cloudflare tunnel token: " CLOUDFLARE_TUNNEL_TOKEN
prompt "Tunnel ID: " TUNNEL_ID
announce "With the power of Cloudflare, we shall travel to $DOMAIN."
sleep 2

next_chapter "Next, you must keep the records straight."
sleep 2
prompt "Database name: " POSTGRES_DB
prompt "Database user: " POSTGRES_USER
#TODO: Auto generate strong password with openssl instead of asking user
prompt "Database password: " POSTGRES_PASSWORD
announce "With this, we shall build a grandiose postgres of data."
sleep 2

next_chapter "Beware, the realm beyond the firewall is treacherous."
announce "We must fortify our champion Django with a powerful secret."
sleep 2
prompt "Set Django's secret key: " DJANGO_SECRET_KEY #TODO: maybe also auto generate this
DJANGO_ALLOWED_HOSTS="$DOMAIN"
DJANGO_TRUSTED_ORIGINS="https://$DOMAIN"
announce "Django is grateful for you hospitality and will trust $DJANGO_TRUSTED_ORIGINS origins."
sleep 2

next_chapter "Fortunes have no worth without friends to share them with."
announce "Oh, auth! If you can summon it, the whole network will be yours."
sleep 2
prompt "What will be thy OAuth client id: " CLIENT_ID
prompt "What will it be, its secret key: " CLIENT_SECRET
REDIRECT_URI="https://$DOMAIN/redirect"
announce "Thus, the lost 42 souls shall be guided to $REDIRECT_URI to find their way."
sleep 2

next_chapter "The final step is to forge the chains that will bind the realm."
announce "You must own the key to the hardhat kingdom."
sleep 2
prompt "Set the blockchain key: " HARDHAT_PRIVATE_KEY
sleep 2

next_chapter "The time has come to transcend this mortal realm."
sed -i "s/<TUNNEL-ID>/$TUNNEL_ID/g" $CFCONFIG
sed -i "s/<DOMAIN>/$DOMAIN/g" $CFCONFIG

echo "DOMAIN=$DOMAIN" > .env
echo "POSTGRES_DB=$POSTGRES_DB" >> .env
echo "POSTGRES_USER=$POSTGRES_USER" >> .env
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> .env
echo "DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY" >> .env
echo "DJANGO_ALLOWED_HOSTS=$DJANGO_ALLOWED_HOSTS" >> .env
echo "DJANGO_TRUSTED_ORIGINS=$DJANGO_TRUSTED_ORIGINS" >> .env
echo "CLIENT_ID=$CLIENT_ID" >> .env
echo "CLIENT_SECRET=$CLIENT_SECRET" >> .env
echo "REDIRECT_URI=$REDIRECT_URI" >> .env
echo "HARDHAT_PRIVATE_KEY=$HARDHAT_PRIVATE_KEY" >> .env

announce "The ritual is complete. $NAME shall rise from the containers."
announce "This shall be your .env file:"
lolcat -a .env || cat .env
echo
announce "Go forth and deploy the $NAME to the world!"
sleep 5
clear
