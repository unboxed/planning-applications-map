function filterTable(event) {
    var table = document.getElementById("applicationTable");
    var tr = table.getElementsByTagName("tr");
    var filterSelect = event.target;

    for (let i = 0; i < tr.length; i++) {
        var row = tr[i];
        var td = row.getElementsByTagName("td")[4];
        if (td) {
            if ("None" === filterSelect.value) {
                row.style.display = "";
            } else if (td.innerHTML === filterSelect.value) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    }

}


function sortTable() {
    var table = document.getElementById("applicationTable");
    var selectedVal = document.getElementById("sortSelect").value;
    var switching = true;
    var i, x, y, shouldSwitch, rows;

    if (selectedVal === "date_des") {
        while (switching) {
            switching = false;
            rows = table.rows;

            for (i = 1; i < (rows.length - 1); i++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("td")[3];
                y = rows[i + 1].getElementsByTagName("td")[3];

                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }

            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
            }
        }
    }
    else {
        while (switching) {
            switching = false;
            rows = table.rows;

            for (i = 1; i < (rows.length - 1); i++) {
                shouldSwitch = false;

                if (selectedVal === "ref") {
                    x = rows[i].getElementsByTagName("td")[1];
                    y = rows[i + 1].getElementsByTagName("td")[1];
                }
                else if (selectedVal === "date_asc" || selectedVal === "date_des") {
                    x = rows[i].getElementsByTagName("td")[3];
                    y = rows[i + 1].getElementsByTagName("td")[3];
                }
                else { break; }

                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                }
            }

            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
            }
        }
    }
}

function resetTable() {
    var tr = document.getElementById("applicationTable").getElementsByTagName("tr");
    for (let i = 0; i < tr.length; i++) {
        tr[i].style.display = "";
    }
    document.getElementById('filterSelect').selectedIndex = 0;
}

// function searchTable() {
//   var input = document.getElementById("tableSearchInput").value.toUpperCase();
//   var tr = document.getElementById("applicationTable").getElementsByTagName("tr");

//   for (let i = 0; i < tr.length; i++) {
//     var tdAddr = tr[i].getElementsByTagName("td")[0];
//     var tdRef = tr[i].getElementsByTagName("td")[1];
//     var tdDesc = tr[i].getElementsByTagName("td")[2];
//     var tdStat = tr[i].getElementsByTagName("td")[4];

//     if (tdAddr) {
//       if (tdAddr.innerText.toUpperCase().indexOf(input) > -1 || tdRef.innerText.toUpperCase().indexOf(input) > -1 || tdDesc.innerText.toUpperCase().indexOf(input) > -1 ) {
//         if (document.getElementById("filterSelect").value === "None") {
//           tr[i].style.display = "";
//         }
//         else if (document.getElementById("filterSelect").value === tdStat.innerText) {
//           tr[i].style.display = "";
//         }
//       }
//       else {
//         tr[i].style.display = "none";
//       }
//     }
//   }
// }   

export { sortTable, filterTable, resetTable };

