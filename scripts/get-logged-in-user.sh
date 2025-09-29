ACCESS_TOKEN=$(sh scripts/auth-flow.sh | jq -r '.accessToken')

echo $ACCESS_TOKEN

http GET http://localhost:3000/auth/whoami Cookie:accessToken=$ACCESS_TOKEN
