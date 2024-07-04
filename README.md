Hi!

This is Hugh(the intern)'s first project at unboxed so go easy on me :)

## How to run

cd into the directory of this readme and type ```npm install``` to install all required dependencies and then run it by typing ```npm start```

## Current status of project

This project is now fully working, it can read a json file and output the points/polygons onto the map (provided the formatting is correct) and follows the GDS (GOV.UK Design System). It uses a GET call from the [bops staging API](https://southwark.bops-staging.services/api/docs/index.html?urls.primaryName=API%20V2%20Docs]) and then formats and displays all found planning applications' address, description and status (if they exist) on the interactive map.
