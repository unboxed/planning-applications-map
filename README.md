Hi!

This is Hugh(the intern)'s first project at unboxed so go easy on me :)

## How to run locally

cd into the directory of this readme and type ```npm install``` to install all required dependencies and then run it by typing ```npm start```

## Current status of project

This project:
- can read a geojson file and output the points/polygons onto the map
- follows GDS (GOV.UK Design System)
- uses a GET call from the [bops staging API](https://southwark.bops-staging.services/api/docs/index.html?urls.primaryName=API%20V2%20Docs]) and then formats and displays all found planning applications' address, description and status (if they exist) on the interactive map
- search by either typing a reference number or UK postcode and pressing enter or clicking the search button

## Current deployment

This project is being actively deployed with each commit to main and can be found [here](https://planning-applications-map-25c36e62b6c2.herokuapp.com/)
