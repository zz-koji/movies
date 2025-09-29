FIRST_USER_ID=$(http GET http://localhost:3000/users | jq -r '.[0].id')

http PATCH http://localhost:3000/users?id=$FIRST_USER_ID pin=654321


