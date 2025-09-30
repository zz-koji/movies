MOVIES_LIST=$(http GET "http://localhost:3000/movies?title=Happy Gilmore" )
echo $MOVIES_LIST | jq '.Search'
