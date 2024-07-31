import { useMap } from 'react-leaflet';
import { Button } from 'govuk-react';

function SearchArea() {
    const map = useMap();

    const searchMapArea = async () => {

        if (!map) { return; }
        var toDisplay = [];

        map.eachLayer(function (layer) {
            if (layer._latlng === undefined) { return; }

            if (map.getBounds().contains(layer._latlng)) {
                if (layer.feature) {
                    toDisplay.push(layer.feature.properties.reference);
                }
            }

            var tr = document.getElementById("applicationTable").getElementsByTagName("tr");

            for (let i = 0; i < tr.length; i++) {
                var td = tr[i].getElementsByTagName("td")[1];
                var tdStat = tr[i].getElementsByTagName("td")[4];
                if (td) {
                    if (document.getElementById("filterSelect").value === "None") {
                        if (toDisplay.includes(td.innerText)) {
                            tr[i].style.display = "";
                        }
                        else {
                            tr[i].style.display = "none";
                        }
                    }
                    else {
                        if (toDisplay.includes(td.innerText) && document.getElementById("filterSelect").value === tdStat.innerText) {
                            tr[i].style.display = "";
                        }
                        else {
                            tr[i].style.display = "none";
                        }
                    }
                }
            }
        });

    }
    return (
        <>
            <Button onClick={searchMapArea} buttonColour="#f3f2f1" buttonHoverColour="#ffdd00" buttonShadowColour="#929191" buttonTextColour="#0b0c0c" 
            style={{ position: 'absolute', bottom: '-4%', left: "21%", zIndex: 4000, width: '170px' }}>
                Search this area
            </Button>
        </>
    );
}

export default SearchArea;