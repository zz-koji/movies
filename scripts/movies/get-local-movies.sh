MOVIES_LIST=$(http GET "http://localhost:3000/movies/local" )
echo $MOVIES_LIST | jq '.'
