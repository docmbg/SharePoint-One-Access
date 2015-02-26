$(document).ready(function() {});
$("#loading").dialog({
    dialogClass: 'dialogDropShadow',
    draggable: true,
    modal: true,
    hide: 'fade',
    show: 'fade',
    autoOpen: false
});
//stores all info about the users input in the main search field
var users = {
    emails: [],
    logins: [],
    names: [],
    emailsXML: "",
    loginsXML: "",
    namesXML: ""
};
/*checks if a string is an email address
@param: string
@return: boolean
*/
    function isValidEmailAddress(emailAddress) {
        //regular expression expressing a valid email address
        var pattern = new RegExp(/^(("[\w-+\s]+")|([\w-+]+(?:\.[\w-+]+)*)|("[\w-+\s]+")([\w-+]+(?:\.[\w-+]+)*))(@((?:[\w-+]+\.)*\w[\w-+]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][\d]\.|1[\d]{2}\.|[\d]{1,2}\.))((25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\.){2}(25[0-5]|2[0-4][\d]|1[\d]{2}|[\d]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    }
    /*removes duplicate items from an array, leaving it only with unique items
@param: array of any type of elements
@return: array

    function removeDuplicates(list) {
        var uniques = [];
        $.each(list, function(i, el) {
            if ($.inArray(el, uniques) === -1) uniques.push(el);
        });
        return uniques;
    }
    
*/    
        /* Flattens a nested array and removes duplicate items from the resulting array, returning a one level array with no duplciates in it
    @param: nested Array
    @return: array
    */
    function flattenListandRemoveDuplicates(list){
        var newlist=Array.prototype.concat.apply([], list) ;
        var uniqueNames = [];
        $.each(newlist, function(i, el){
            if($.inArray(el, uniqueNames) === -1) uniqueNames.push(el);
        });
        return uniqueNames;
    }

    /*Checks if an element can be found in all arrays in a nested array, and if so, returns and array of all such elemnts
    @param: nested array
    @return: array
    */
    function removeDuplicates(list) {
        var ours=[];
        var uniques = flattenListandRemoveDuplicates(list);
        for (var i = 0; i<uniques.length; i++){
            var n = list.length;
            //return list.length;
            for (elem in list){
                if (list[elem].indexOf(uniques[i])!=-1){
                    n=n-1;
                }
            }
            if (n===0){
                ours.push(uniques[i]);
            }
        }
        return ours;
    }    
    
    
    
    function xmlencode(string) {
    return string.replace(/\&/g,'&'+'amp;').replace(/</g,'&'+'lt;')
        .replace(/>/g,'&'+'gt;').replace(/\'/g,'&'+'apos;').replace(/\"/g,'&'+'quot;');
}

  

    /*converts an array of emails to an XML for the use of SPServices in the following format
<Users><User Email="firstname.lastname@domain.com"></Users>
@param:array of strings
@return: string (XML)
*/
    function ConvertEmailListToXML(emails) {
        emailsXML = "";
        for (var i = 0; i < emails.length; i++) {
            emailsXML += "<User Email=\"" + emails[i] + "\"/>";
        }
        return "<Users>" + emailsXML + "</Users>";
    }

    /*Function fires on click of the main search button, captures all user input from the main search field,
    feeds it into an array of emails,
    searches for the login names of each user whose email is in the array using SPGetUserLoginFromEmail,
    if the login name is found, it is fed into the "users" object and also an XML of logins is fed there too.
    The XML format is <User LoginName="domain\loginname">

    @param: none, fired on Search button click
    @return:none, calls RefreshGroupsLists()
    */

    function processUserName() {
        $("#my_NewUsers").val('');

        //clear the object values before every new load for a user input
        users.emails = [];
        users.logins = [];
        users.names = [];
        users.emailsXML = "";
        users.loginsXML = "";
        users.namesXML = "";

        groups.assigned = [];
        //clear the lists of groups before every new load for a user input
        $("#my_SPGroupsAssigned").html("");
        $("#my_SPGroupsAvailable").html("");
        //clear the "Grant same permissions field"
        
        //load user input from main search field in var
        userInput = ($("#my_SiteUsers").val());
        //if user has input something process the string input ad filter out all empty strings
        if (userInput !== "") {
            userInput = ($("#my_SiteUsers").val()).split(",");
            //remove empty strings
            userInput = userInput.filter(function(v) {
                return v !== ''
            });
            users.emails = userInput;
            users.emailsXML = ConvertEmailListToXML(users.emails); //convert the input into XML
            //console.log("This is the emails XML passed to SPServices: " + users.emailsXML);
            var prom = SPGetUserLoginFromEmail(users.emailsXML); //get logins using SPServices
            //if SPServices returns a failure response, alert user
            prom.fail(function() {
                alert("There is no user with these credentials in the Global Address Book.");
            })
            //if no failure response is received, 
            prom.done(function() {
                var proceed = true;
                $(prom.responseXML).find('User').each(function() {
                    users.loginsXML += "<User LoginName=\"" + $(this).attr("Login") + "\"/>";
                    users.logins.push($(this).attr("Login"));
                })
                console.log("All existing logins:");
                for (var a = 0; a < users.logins.length; a++) {
                    console.log(users.logins[a]);
                    if (users.logins[a] === "") {
                        proceed = false;
                        ///colour the unfound logins in red instead of blue
                        $('div:contains("' + users.emails[a] + '")').parent(".select2-search-choice").addClass('error-choice');
                        $('div:contains("' + users.emails[a] + '")').parent(".select2-search-choice").click(function() {
                            $(this).toggleClass("error-choice-focus error-choice");
                        });
                    }
                }

                //console.log("Logins XML of users in upper search field:\n " + users.loginsXML);
                //show groups only if user exist in global address book
                if (proceed == true) {
                    RefreshGroupsLists();
                }
            })
        } else {
            alert("Please provide email(s) separated by a semicolon ';'.");
        }
    }

    /*SPServices call to find a user's loginname using his/her email address
@param:string (XML of emails)
@return: SPServices response to the call
*/
    function SPGetUserLoginFromEmail(emailsXML) {
        var prom = $().SPServices({
            async: true,
            operation: "GetUserLoginFromEmail",
            emailXml: emailsXML,
            completefunc: function(xData, Status) {
                if (Status == "error") {
                    console.log("Error in SPGetUserLoginFromEmail. User login details cannot be retrieved from this email.");
                }
            }
        });
        return prom;
    }


    /*Function calling SPAddUSerCollectionToGroup only after checking  if all conditions are met, i.e.:
@param: none
@return: none, calls RefreshGroupsLists
*/
    function AddGroupsToUser() {

        var i;
        if (users.logins[0] == undefined || users.logins[0] == "" && users.loginsXML == "") {
            alert("You must select a user");
            return;
        }
        if ($("#my_SPGroupsAvailable").val() == null) {
            alert("You haven't selected any groups to add");
            return;
        }
        if ($("#my_SPGroupsAvailable").val().length>5) {
            alert("Please select a maximum of 5 groups at a time.");
           return;
            
        }
        else{
            $("#loading").dialog('open').html("<div><img src=\"https://googledrive.com/host/0B05gvY7cupTtREdXY2ZqZTZfem8/loading_hp_blue.gif\" style=\"display: inline-block; float: left; width: 21px; height: 21px; padding-right: 5px; \">" + "<p style=\" valign: middle;\"> Please wait...</div>");
            var end = SPAddUserCollectionToGroup();
            $.when.apply($, end).done(function() {
                console.log("All users were added to the selected groups.");
                RefreshGroupsLists()
            });
        }
    }
    /*Add multiple users to each one of the groups in the list arrGroups which contains all selected groups 
@param: none
@return: an array of responses of the SPServices call
*/
    function SPAddUserCollectionToGroup() {
        var all_additions = [];
        var arrGroups = $("#my_SPGroupsAvailable").val();
        for (i = 0; i < arrGroups.length; i++) {
            var addition = $().SPServices({
                operation: "AddUserCollectionToGroup",
                groupName: xmlencode(arrGroups[i]),
                usersInfoXml: "<Users>" + users.loginsXML + "</Users>",
                async: true,
                completefunc: function(xData, Status) {}
            })
            all_additions.push(addition.done());
        }
        return all_additions;

    }

    /* 
@param none
@return: none, calls RefreshGroupsLists
*/
    function RemoveGroupsFromUser() {

        if (users.logins[0] == undefined || users.logins[0] == "" && users.loginsXML == "") {
            alert("You must select a user");
            return;
        }else if ($("#my_SPGroupsAssigned").val() === null) {
            alert("You haven't selected any groups to remove.");
            return;
        }else if($("#my_SPGroupsAssigned").val().length>5) {
               alert("Please select a maximum of 5 groups at a time.");
               return;
         }
         
        if (($("#my_SPGroupsAssigned").val()).length === groups.assigned.length){
            alert("Please be aware that removing these users from all the selected groups does not remove them from the SP site. To do that please use the HP OneAccess tool.");
        }
        if ($("#my_SPGroupsAssigned").val().length >=1){
                        $("#loading").dialog('open').html("<div><img src=\"https://googledrive.com/host/0B05gvY7cupTtREdXY2ZqZTZfem8/loading_hp_blue.gif\" style=\"display: inline-block; float: left; width: 21px; height: 21px; padding-right: 5px; \">" + "<p style=\" valign: middle;\"> Please wait...</div>");
                            //if only some of the groups are selected (not all of them), remove the users from each group and refresh
                var end = SPRemoveUserCollectionFromGroup();
                $.when.apply($, end).done(function() {
                    RefreshGroupsLists();
                });
        }
        /*
        //check if all groups are selected from the user on not, and if so, delete the user form site collection instead of removing him just from the groups
        if (($("#my_SPGroupsAssigned").val()).length === groups.assigned.length) {
            var response_list = [];
            //delete user from entire sp since all groups were selected
            for (var i = 0; i < users.logins.length; i++) {
                //call SPServices function to remove user from site collection using his/her login name
                var a = $().SPServices({
                    operation: "RemoveUserFromSite",
                    userLoginName: users.logins[i],
                    async: false,
                    completefunc: function(xData, Status) {
                        //if a user is site collection owner of the SP, an alert is thrown to alarm user of this
                        if (Status == "error") {
                            alert("You are not allowed to remove site collection owner: " + users.logins[i]);
                        }
                        //else delete the user and promt in console
                        console.log("Deleting user from site: " + users.logins[i]);
                    }
                });
                //store all SPServices request responses and refresh groups lists only when all are received
                response_list.push(a);
            }
            $.when.apply($, response_list).always(function() {
                console.log("All users were removed from the selected  groups.");
                RefreshGroupsLists();
            })

        }*/  
    }

    function SPRemoveUserCollectionFromGroup() {
        var arrGroups = $("#my_SPGroupsAssigned").val();
        var all_removals = [];
        for (i = 0; i < arrGroups.length; i++) {
            var removal = $().SPServices({
                operation: "RemoveUserCollectionFromGroup",
                groupName: xmlencode(arrGroups[i]),
                userLoginNamesXml: "<Users>" + users.loginsXML + "</Users>",
                async: true,
                completefunc: null
            });
            all_removals.push(removal.done());
        }
        return all_removals;
    }


    function SPGetGroupCollectionFromUser(loginname) {
        var group_coll = $().SPServices({
            operation: "GetGroupCollectionFromUser",
            userLoginName: loginname,
            async: true

        });
        return group_coll;
    }

    //object to store all assigned and available groups
var groups = {
    assigned: [],
    available: []
};





    function RefreshGroupsLists() {
    $("#loading").dialog().html();
    $("#loading").dialog('open').html("<div><img src=\"https://googledrive.com/host/0B05gvY7cupTtREdXY2ZqZTZfem8/loading_hp_blue.gif\" style=\"display: inline-block; float: left; width: 21px; height: 21px; padding-right: 5px; \">" + "<p style=\" valign: middle;\"> Please wait...</div>");
        groups.assigned = []; //empty the assigned groups array 
        //clear all text areas on the page to allow accurate refresh of details
        var strHTMLAvailable = "";
        var strHTMLAssigned = "";
        var arrOptionsAssigned = new Array();
        var intOpts = 0;
        var booMatch;
        var booErr = "false";
        //clear all lists
        $("#my_SPGroupsAssigned").html("");
        $("#my_SPGroupsAvailable").html("");
        //if at least one user is selected
        if (users.logins.length >= 1) {
            var allGroups = [];
            var all = []; //stores all responses of group collections
            for (var i = 0; i < users.logins.length; i++) {
                var user_group_coll = SPGetGroupCollectionFromUser(users.logins[i]);
                user_group_coll.fail(function() {
                	$("#loading").dialog('close');
                    //console.log("One or more users are not present on this site.");
                })
                //add each response containg the groups for the user to the all array 
                all.push(user_group_coll);
            }
            //in either failure or success show the assigned groups
            $.when.apply($, all).fail(function() {
                for (var i = 0; i < all.length; i++) {
                     var new_group_col=[];
                    $(all[i].responseXML).find("Group").each(function() {
                        var groupname = $(this).attr("Name");
                        new_group_col.push(groupname);
                        //allGroups.push(groupname);
                    })
                     allGroups.push(new_group_col);
                }
                console.log(allGroups);
                var commonGroups = removeDuplicates(allGroups);
                console.log(commonGroups);
                for (var m = 0; m < commonGroups.length; m++) {
                    //create a string with those to put in the assigned groups container
                    strHTMLAvailable += "<option value='" + commonGroups[m] + "'>" + commonGroups[m] + "</option>";
                }
                $("#my_SPGroupsAssigned").append(strHTMLAvailable);
               // $("#loading").dialog('close');
            })
            $.when.apply($, all).done(function() {
                for (var i = 0; i < all.length; i++) {
                   var new_group_col=[];
                    $(all[i].responseXML).find("Group").each(function() {
                        var groupname = $(this).attr("Name");
                        new_group_col.push(groupname);
                        //allGroups.push(groupname);
                    })
                   allGroups.push(new_group_col);

                }
                console.log(allGroups);
                var commonGroups = removeDuplicates(allGroups);
                console.log(commonGroups);

                for (var m = 0; m < commonGroups.length; m++) {
                    //create a string with those to put in the assigned groups container
                    strHTMLAvailable += "<option value='" + commonGroups[m] + "'>" + commonGroups[m] + "</option>";
                    groups.assigned.push(commonGroups[m]);
                }

                $("#my_SPGroupsAssigned").append(strHTMLAvailable);
                $("#loading").dialog('close');
                ///////////////////////////////////////////////////

            })
            //always show the availble groups on the SP (i.e. all groups on the SP)
            $.when.apply($, all).always(function() {
                var site_group_coll = SPGetGroupCollectionFromSite();
                site_group_coll.done(function() {
                    $(site_group_coll.responseXML).find("Group").each(function() {
                        var group_name = $(this).attr("Name");
                        // booMatch = "false";
                        // if (commonGroups.indexOf(group_name) == -1) {
                        strHTMLAssigned += "<option value='" + group_name + "'>" + group_name + "</option>";
                        // }
                    })
                    $("#my_SPGroupsAvailable").append(strHTMLAssigned);
                })
            });
        }
    }

    /*Get all groups form the site
@param: none
@return: SPservices response with all groups, etc.
*/
    function SPGetGroupCollectionFromSite() {
        var group_coll = $().SPServices({
            operation: "GetGroupCollectionFromSite",
            async: true
        })
        return group_coll;
    }

    /////////////////////////////////////////////
    /////// GRANT SAME PERMISSIONS /////////////
    ///////////////////////////////////////////

    //object to contain info about the secondary input field of user
var new_users = {
    emails: [],
    logins: [],
    names: [],
    emailsXML: "",
    loginsXML: "",
    namesXML: "",
    groups: []
}
/*function called when the Grant button is clicked, processes the new input

@param: none
@return: none
*/
    function process_new_username() {
        if ($("#my_NewUsers").val() == "") {
            alert("You have not selected any users. Please input at least one email.");
        } else {
            if (users.logins.length > 1) {
                alert("Please choose only one user whose permissions you would like to copy in the top search bar and press search again.");
            } else if (users.logins.length == 0) {
                alert("You have not chosen a user whose permissions you would like to mimic.");
            } else {
                    $("#loading").dialog('open').html("<div><img src=\"https://googledrive.com/host/0B05gvY7cupTtREdXY2ZqZTZfem8/loading_hp_blue.gif\" style=\"display: inline-block; float: left; width: 21px; height: 21px; padding-right: 5px; \">" + "<p style=\" valign: middle;\"> Please wait...</div>");
                new_users.emails = [];
                new_users.logins = [];
                new_users.names = [];
                new_users.emailsXML = "";
                new_users.loginsXML = "";
                new_users.namesXML = "";
                new_users.groups = [];


                userInput = ($("#my_NewUsers").val()).split(";");
                //console.log("Users to copy groups to: "+userInput);
                userInput = userInput.filter(function(v) {
                    return v !== ''
                }); //remove empty strings
                new_users.emails = userInput;
                new_users.emailsXML = ConvertEmailListToXML(new_users.emails);
                //console.log(new_users.emailsXML);
                var prom = SPGetUserLoginFromEmail(new_users.emailsXML);
                prom.fail(function() {
                    alert("There is no user with these credentials in the Global Address Book.");
                })
                prom.done(function() {
                    //var proceed = true;
                    $(prom.responseXML).find('User').each(function() {
                        var login = $(this).attr("Login");
                        if (login != "") {
                            new_users.loginsXML += "<User LoginName=\"" + login + "\"/>";
                            new_users.logins.push(login);
                        }
                    })
                    console.log("Logins XML with users from the bottom input area: "+new_users.loginsXML);
                    if (new_users.logins.length > 0) {
                        getGroups_newUser();
                            $("#loading").dialog('close');
                    } else {
                        alert("No such user(s) exist in the Global Address Book. Please try again.");
                    }
                    // for (var k = 0; k < new_users.groups.length; k++) {
                    //     console.log(new_users.groups[k]);
                    // }
                })
            }

        }


    }


    function getGroups_newUser() {
        for (var i = 0; i < new_users.logins.length; i++) {
            console.log("Now copying groups to user: "+new_users.logins[i]);
            var user_groups = [];
            var user_group_coll = SPGetGroupCollectionFromUser(new_users.logins[i]);
            user_group_coll.fail(function() {
                console.log("Warning: User does not exist on this SP.");
            })
            user_group_coll.done(function() {

                $(user_group_coll.responseXML).find("Group").each(function() {
                    var groupname = $(this).attr("Name");
                    user_groups.push(groupname);
                })
                new_users.groups.push(user_groups);
                if (users.logins.length > 1) {
                    alert("Please choose only one user whose permissions you would like to copy in the top search bar and press search again.");

                } else {
                    console.log("These users: "+ new_users.loginsXML + " will be added to the following groups: " + groups.assigned);
                    //console.log(groups.assigned.length);
                    
                    if (groups.assigned.length > 0) {
                        for (i = 0; i < groups.assigned.length; i++) {
                            //console.log(groups.assigned[i]);

                            //console.log(new_users.loginsXML);

                            var addition = $().SPServices({
                                operation: "AddUserCollectionToGroup",
                                groupName: xmlencode(groups.assigned[i]),
                                usersInfoXml: "<Users>" + new_users.loginsXML + "</Users>",
                                async: true
                            })
                        }
                    } else {
                        alert("You have not selected any groups.");
                    }

                }
            })


            //groups_assigned.push(user_group_coll);
        }
    }