ACCESS_TOKEN=$(sh scripts/users/auth-flow.sh | jq -r '.accessToken')

if [ -v ACCESS_TOKEN ]; then
	echo "Successfully retrieved access token. \n $ACCESS_TOKEN"
fi

WHO_AM_I_RESPONSE=$(http GET http://localhost:3000/auth/whoami Cookie:accessToken=$ACCESS_TOKEN)

echo -e "\nLogged in User: "
if [ -v WHO_AM_I_RESPONSE ]; then
	echo "$WHO_AM_I_RESPONSE" | jq '.'
fi
