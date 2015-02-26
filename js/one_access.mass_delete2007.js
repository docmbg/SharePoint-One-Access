/* Actions performed on load of the page
 * check if browser supports the file upload function (HTML5 File API)
 * prompt user with warning about result
 */

// HELPER FUNCTIONS //
function xmlencode(string) {
    return string.replace(/\&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;')
        .replace(/>/g, '&' + 'gt;').replace(/\'/g, '&' + 'apos;').replace(/\"/g, '&' + 'quot;');
}

$(document).ready(function() {
    //check if browser supports HTML5 File API
    if (isAPIAvailable()) {
        $('#fileInput').bind('change', handleFileSelect);
    }
    //setup the dialog with 2 buttons-Delete all users & Cancel
});

$("#loading").dialog({
    dialogClass: 'dialogDropShadow',
    draggable: true,
    modal: true,
    hide: 'fade',
    show: 'fade',
    autoOpen: false,
    buttons: {
        'Delete': {
            text: 'Delete users',
            'class': 'delUsers',
            click: function() {
                removeUsersIndividually(allUsers.loginNames);
            }
        },
        'Cancel': {
            text: 'Cancel',
            'class': 'cancelBtn',
            click: function() {
                $(this).dialog("close");
            }
        }
    }
});
// displays a warning if the browser doesn't support the HTML5 File API

function isAPIAvailable() {
    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        return true;
    } else {
        alert("The browser you're using does not currently support\nthe HTML5 File API. As a result the file loading \nwon't work properly. Please use another browser version (i.e. Chrome or Firefox).");
        return false;
    }
}
// handles csv file upload and store

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    for (var i = 0, len = files.length; i < len; i++) {
        flotFileData(files[i], i);
    }
}

$('.uploadBtn').bind("click", function() {
    $('#fileInput').click();
});
document.getElementById("fileInput").onchange = function() {
    document.getElementById("uploadFile").value = this.value;
};
//helper function splitting array a into n slices/arrays

function split(a, n) {
    var len = a.length,
        out = [],
        i = 0;
    while (i < len) {
        var size = Math.ceil((len - i) / n--);
        out.push(a.slice(i, i += size));
    }
    return out;
}
//reads the csv file(s) and saves all emails in an array
//called only when a file is loaded!

function flotFileData(file, i) {
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function(event) {
        var csv = event.target.result;
        //array with all users that have to be deleted
        try {
            var newData = $.csv.toArray(csv);
            if (newData === "") {
                alert("Please select a file that contains at least one user email.");
            } else {
                //the number of slices to split the arrray at
                var numOfSlices = Math.ceil(newData.length / 100);
                //the list of lists of users with up to a 100 users in a slice/sublist
                newarray = split(newData, numOfSlices);
                console.log(newarray.length + " is the number of chunks. " + newData.length + " is the number of users.");
                for (var i = 0; i < newarray.length; i++) {
                    console.log("========= Processing chunk number " + i + " =========");
                }
                allUsers.emails = newarray; //feed the nested array in the users object (in the emails property)
                getLoginFromEmail(allUsers.emails); //get the loginnames for the emails
            }

        } catch (err) {
            function createDialog(title, text) {
                return $("<div class='dialog' title='" + title + "'><p>" + text + "</p></div>").dialog({
                    dialogClass: 'dialogDropShadow',
                    draggable: true,
                    modal: true,
                    hide: 'fade',
                    show: 'fade',
                    buttons: {
                        'Okay': {
                            text: 'OK',
                            'class': 'delUsers',
                            click: function() {
                                $(this).dialog("close");
                            }
                        }
                    }
                });
            }
            createDialog("File type error", "Please select a valid .csv file!");
        }
    };
    reader.onerror = function() {
        alert('Unable to read ' + file.fileName);
    };
}
/* object allUsers
 * contains the info about the list of users uploaded in csv
 * @properties
 * loginNames: array of the account names of the users
 * emails: array of the emails of the users
 */
var allUsers = {
    loginNames: [],
    emails: []
};


function SPremoveUserFromSite(user_name){

	var callback=$().SPServices({
                operation: "RemoveUserFromSite",
                userLoginName: user_name,
                async: false,
		completefunc: function(xData, Status) {
			
			
			if (Status == "error") {
                        alert("Not able to remove user with login name: " + user_name);
                    }
                    //if a Site Owner is found an error is generated,catch it

		}
	});
	
	//return callback;
}

/*Function removes users fed in param from the SP
 * @param: allUsers.loginNames (a nested array of the login names of all users * pending deletion, found using SPServices GetLoginFromEmail() )
 * @return: false (if param empty); else true
 * @alert: If POST Error 500 returned by the server on calling
 * "RemoveUserFromSite", alert the username where error occurs
 */

function removeUsersIndividually(allUsers) {
    document.getElementById('commentUser').innerHTML = "";
    console.log(allUsers);
    var procdUsers = [],
        notFound = 0,
        siteOwners = [];
    //check if file is uploaded, if not return false
    console.log("These are the users to be removed individually" + allUsers);
    $('#loading').html("<p>Removing Users!</p>");
    $(".delUsers").button("option", "disabled", true);
    var remainingUsers = [];
    //this only works if html file is linked in a web part f.ex
    var spversion;
    if (typeof _fV4UI == "undefined") {
        console.log("SP version is 2007");
        spversion = false;
    } else {
        console.log("SP version is 2010 or 2013");
        spversion = true;
    }

    //ADD HERE CONDITION TO CHECK IF USER IS NOT FOUND i.e. === ""
    //and print it somewhere/log it
    for (var i = 0; i < allUsers.length; i++) {
        var uName = allUsers[i];
        procdUsers.push(uName);
        console.log(uName);
        if (uName !== "") {
			var callback=SPremoveUserFromSite(uName);
                    $.when.apply(callback, procdUsers).done(function() {
                        if (allUsers.length == procdUsers.length) {
                            $('#loading').html("<p>Users removed!</p>");
                            $(".cancelBtn").button("option", "label", "OK");
                        }
                    });
        } else {
            notFound += 1;
        }
    }
    document.getElementById('commentUser').innerHTML += "All operations completed!" + "\n";
    if (notFound > 0) {
        document.getElementById('commentUser').innerHTML += "\n" + "Action Log: \n" + "Could not be found in the Global Address Book: " + notFound + "\n";
        document.getElementById('commentUser').innerHTML += "Number of users removed: " + (procdUsers.length - (notFound + siteOwners.length)) + "\n";
    }
}

/* Function loads an array of user loginames found using SPServices
 * GetUserLoginFromEmail()
 * @param: emails (a nested array each of up to 100 emails of users)
 * @return: none, feeds the login names in an object property
 * @alert: none
 */

function getLoginFromEmail(emails) {
    var listOfXmls = []; //initialize an array of xml files(!) containing the chunks of login names
    //for each array in the nested array of emails fill up one xml string with emails
    for (var j = 0; j < emails.length; j++) {
        var allEmailsXml = "";
        for (var i = 0; i < emails[j].length; i++) {
            var email = emails[j][i];
            var a = "<User Email=\"" + email + "\"\/>";
            console.log("=========================== " + (a));
            allEmailsXml += (a);
        }
        var us1 = ("<Users>");
        var us2 = ("</Users>");

        listOfXmls.push(us1 + allEmailsXml + us2);
        allEmailsXml = "";
    }
    console.log("Iteration id is: " + listOfXmls.length);
    //show dialog box while loading users
    $(".delUsers").button("option", "disabled", true);
    $("#loading").dialog('open').html("<div><img src=\"https://googledrive.com/host/0B05gvY7cupTtREdXY2ZqZTZfem8/loading_hp_blue.gif\" style=\"display: inline-block; float: left; width: 21px; height: 21px; padding-right: 5px; \">" + "<p style=\" valign: middle;\"> Identifying users</p></div>");
    //loop through all lists of xmls of emails and get the login name for each email and store it in the allUsers.loginNames object property
    for (var aa = 0; aa < listOfXmls.length; aa++) {
        var aUser = listOfXmls[aa];
        console.log("=========================== " + aUser);
        console.log("GetUserLoginFromEmail running one iteration...");
        $().SPServices({
            operation: 'GetUserLoginFromEmail',
            emailXml: aUser,
            completefunc: function(xData, Status) {
                $(xData.responseXML).find("User").each(function() {
                    var passBack = $(this).attr("Login");
                    console.log("--------------passback------------ " + passBack);
                    allUsers.loginNames.push(passBack);
                });
                //inform user (in the dialog) that users have been identified
                $(".delUsers").button("option", "disabled", false);
                $('#loading').html("<p>Users identified!</p>");
                console.log(allUsers);
            }
        });
    }
}
function SPgetUserLoginFromEmail(user_email){
	var callback= $().SPServices({
            operation: 'GetUserLoginFromEmail',
            emailXml: user_email,
            completefunc: function(xData, Status) {
                $(xData.responseXML).find("User").each(function() {
                    var passBack = $(this).attr("Login");
                    console.log("--------------passback------------ " + passBack);
                    allUsers.loginNames.push(passBack);
                });
                //inform user (in the dialog) that users have been identified
                $(".delUsers").button("option", "disabled", false);
                $('#loading').html("<p>Users identified!</p>");
                console.log(allUsers);
            }
        });
	return callback;
}