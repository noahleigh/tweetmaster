// Define the collection for holding all tweets if it doesn't exist yet.
Tweets = new Mongo.Collection('tweets');

// ROUTING

// The Main template will be used for all pages, with content inserted in it.
Router.configure({
    layoutTemplate: 'main'
});

// Moved this logic out of the templating engine, which should be much neater with less redraws.
// If no one is logged in, show the welcome screen. Otherwise show the user their homescreen.
Router.route('/', {
    name: 'home',
    template: 'home',
    onBeforeAction: function(){
        if (Meteor.userId()) {
            this.next();
        } else {
            this.render('welcome');
        }
    }
});

// Visiting /user/[userid] will show you their tweets.
Router.route('/user/:_id', {
    name: 'userpage',
    template: 'userpage',
    data: function(){
        return Tweets.find({authorID: this.params._id}, {sort: {createdAt: -1}});
    }
});

// Visiting /tweet/[tweetid] will show you their tweets.
Router.route('/tweet/:_id', {
    name: 'tweet',
    template: 'tweet',
    data: function(){
        var object = {_id: this.params._id}
        return object;
    }
});

// Visiting /alltweets will display all the tweets in the database. For testing.
Router.route('/alltweets', {
    name: 'alltweets',
    template: 'tweetfeed',
    onAfterAction: function (){
        console.log("looking at ALL the tweets");
    }
});

// END ROUTING

if (Meteor.isServer) {
    Meteor.startup(function() {
        // code to run on server at startup
        // Make tweets available to the client
        Meteor.publish("tweets", function() {
            return Tweets.find({});
        });
        // Make users available to client (may not be necessary)
        Meteor.publish("users", function() {
            return Meteor.users.find({}, {
              _id: 1,
              profile: 1
            });
        });

        // http://joshowens.me/the-curious-case-of-the-unknowing-leaky-meteor-security/
        Meteor.users.deny({  
          update: function() {
            return true;
          }
        });

        // From the socialize:friendships package (https://github.com/copleykj/socialize-friendships/wiki/Publications)
        //Publish friend records with their related user records
        Meteor.publish("friends", function (options) {
            if(!this.userId){
                return this.ready();
            }

            options = options || {};

            //only allow the limit and skip options
            options = _.pick(options, "limit", "skip", "sort");



            Meteor.publishWithRelations({
                handle: this,
                collection: Meteor.friends,
                filter: {userId:this.userId, friendId:{$ne:this.userId}},
                options:options,
                mappings: [{
                    key: 'friendId',
                    collection: Meteor.users,
                    options:{fields:{username:true, avatarId:true, status:true}}
                }]
            });
        });

        Meteor.publish('friendRequests', function(options){
            if(!this.userId){
                return this.ready();
            }

            options = options || {};

            //only allow the limit and skip options
            options = _.pick(options, "limit", "skip", "sort");

            Meteor.publishWithRelations({
                handle: this,
                collection: Meteor.requests,
                filter: {userId:this.userId, denied:{$exists:false}, ignored:{$exists:false}},
                options:options,
                mappings: [{
                    key: 'requesterId',
                    collection: Meteor.users,
                    options:{fields:{username:true, avatarId:true}}
                }]
            });

        });

        Meteor.publish('ignoredFriendRequests', function(options){
            if(!this.userId){
                return this.ready();
            }

            options = options || {};

            //only allow the limit and skip options
            options = _.pick(options, "limit", "skip", "sort");

            Meteor.publishWithRelations({
                handle: this,
                collection: Meteor.requests,
                filter: {userId:this.userId, denied:{$exists:false}, ignored:{$exists:true}},
                options:options,
                mappings: [{
                    key: 'requesterId',
                    collection: Meteor.users,
                    options:{fields:{username:true, avatarId:true}}
                }]
            });

        });

        Meteor.publish('outgoingFriendRequests', function(options){
            if(!this.userId){
                return this.ready();
            }

            options = options || {};

            //only allow the limit and skip options
            options = _.pick(options, "limit", "skip", "sort");

            Meteor.publishWithRelations({
                handle: this,
                collection: Meteor.requests,
                filter: {requesterId:this.userId, denied:{$exists:false}},
                options:options,
                mappings: [{
                    key: 'requesterId',
                    collection: Meteor.users,
                    options:{fields:{username:true, avatarId:true}}
                }]
            });

        });
    });
}


if (Meteor.isClient) {

    // Look at the published collection of tweets, update if there are changes
    Meteor.subscribe("tweets");

    // Allow the client to get the user's name from their id (TBD)
    Meteor.subscribe("users");

    Meteor.subscribe("friends");
    Meteor.subscribe("friendRequests");
    Meteor.subscribe("ignoredFriendRequests");
    Meteor.subscribe("outgoingFriendRequests");

    // Code adapted from http://blog.benmcmahen.com/post/41741539120/building-a-customized-accounts-ui-for-meteor
    Template.signup.events({
        'submit #sign-up': function(e, t) {
            e.preventDefault();
            // retrieve the input field values
            var firstname = t.find('#sign-up-first-name').value;
            var lastname = t.find('#sign-up-last-name').value;
            var email = t.find('#sign-up-email').value;
            var password = t.find('#sign-up-password').value;

            // Trim and validate your fields here.... 

            Accounts.createUser({
                email: email,
                password: password,
                profile: {
                    firstname: firstname,
                    lastname: lastname,
                    friends: [

                    ]
                }
            }, function(err) {
                if (err) {
                    // User account creation failed
                } else {
                    // The user account has created and logged in.
                    alert("Account created succesfully!");
                    // Clear Form
                    for (var i = document.querySelectorAll("#sign-up input").length - 1; i >= 0; i--) {
                        document.querySelectorAll("#sign-up input")[i].value = "";
                    };
                }
            });
            return false;
        }
    });

    // Code adapted from http://blog.benmcmahen.com/post/41741539120/building-a-customized-accounts-ui-for-meteor
    Template.login.events({
        'submit #login': function(e, t) {
            e.preventDefault();
            // retrieve the input field values
            var email = t.find('#login-email').value,
                password = t.find('#login-password').value;

            // Trim and validate your fields here.... 

            // If validation passes, supply the appropriate fields to the
            // Meteor.loginWithPassword() function.
            Meteor.loginWithPassword(email, password, function(err) {
                if (err) {
                    // Inform the user that their login attempt has failed. 
                    alert("Wrong email/password");
                    document.getElementById("login-password").value = "";
                } else {
                    // The user has been logged in.
                    console.log("User "+Meteor.userId()+ "logged in.");
                }
            });
            return false;
        }
    });

    // Handles our logout
    Template.logout.events({
        'submit #logout': function() {
            var userid = Meteor.userId();
            Meteor.logout(function(err) {
                if (err) {
                    // Couldn't logout
                    alert("You have not been logged out.");
                } else {
                    // Tell the user we logged them out
                    console.log("User "+userid+" has been logged out.");
                }
            });
            return false;
        }
    });

    Template.logout.helpers({
      email: function() {
            return Meteor.user().emails[0].address;
        },
    });

    // Handles our testing userinfo template
    Template.userinfo.helpers({
        email: function() {
            return Meteor.user().emails[0].address;
        },
        internalId: function() {
            return Meteor.userId();
        }
    });

    //Handles posting tweets
    Template.tweetentry.events({
        'submit #tweet-entry': function(event) {
            // Don't refresh automatically on submit
            event.preventDefault();

            var text = event.target[0].value;
            var authorID = Meteor.userId();

            // Validate and tweak tweet contents...
            // In this case, don't let them post if there is no content in the tweet.
            if (text == "") {
                alert("You must have something to post...");
                // Refocus the entry box to make it easy to type.
                document.getElementById("tweet-entry-text").focus();
            } else{
              // Debug output
              console.log("Form submitted");
              console.log("authorID: " + authorID);
              console.log("Tweet text: " + text);

              // Insert the tweet and metadata into the database collection
              Tweets.insert({
                  authorID: authorID,
                  createdAt: new Date(),
                  text: text
              }, function(err) {
                  if (err) {
                      alert("Your tweet did not get saved");
                  } else {  
                      console.log("Insert succesful.");
                      // Empty the Tweet Entry form after submission
                      document.getElementById("tweet-entry-text").value = "";
                  };
              });
            };
        }
    });

    // Handles making a list of Tweet template's. Changes based on routing context.
    Template.tweetfeed.helpers({
        tweets: function() {
            if (Router.current().route.getName() == 'home') {
                // Gets a pointer to the Tweets collection, filtered by current user, sorted newest-first.
                var friendArray = Meteor.user().friendsAsUsers().fetch();
                for (var i = friendArray.length - 1; i >= 0; i--) {
                    friendArray[i] = friendArray[i]._id;
                };
                friendArray.push(Meteor.userId());
                return Tweets.find({authorID: {$in: friendArray} }, {sort: {createdAt: -1 }})
            } else if (Router.current().route.getName() == 'userpage') {
                // For when tweetfeed is used in a userpage context
                return Tweets.find({authorID: Router.current().params._id}, {sort: {createdAt: -1 }})
            } else if (Router.current().route.getName() == 'alltweets') {
                console.log("Tweetfeed Template hit 'alltweets'");
                // For when we want to see ALL the tweets
                return Tweets.find({}, {sort: {createdAt: -1 }});
            };    
        }
    });

    // Profile information on user pages. Will probably be expanded.
    Template.userprofileinfo.helpers({
        firstname: function () {
            return Meteor.users.findOne({_id: Router.current().params._id}).profile.firstname;
        },
        lastname: function () {
            return Meteor.users.findOne({_id: Router.current().params._id}).profile.lastname;
        },
        // Don't show the Friend Request button on the user's own page when logged in.
        notCurrentUser: function(){
            return Router.current().params._id !== Meteor.userId();
        },
        // Handles what the Friend Request button displays
        addfriend: function () {
            var friendList = Meteor.user().friendsAsUsers().fetch();
            var requestList = Meteor.user().pendingRequests().fetch();

            // Takes an array of Friends, an ID too look for
            function isFriend(array, id){
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i]._id == id) {
                        console.log("We found "+ id);
                        return true;
                    };
                };
                return false;
            };

            // Takes an array of Friend Requests, a userID too look for
            function hasRequested(array, id){
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i].userId == id) {
                        console.log("We found "+ id);
                        return true;
                    };
                };
                return false;
            };
            
            if (isFriend(friendList, Router.current().params._id)) {
                // Does the current user have this other user in their friends list?
                return "Unfriend";
            } else {
                if (hasRequested(requestList, Router.current().params._id)) {
                    // Has the current user already requested friendship with this user?
                    return "Cancel Friend Request"
                } else {
                    return "Add as Friend";
                };
            };

        },
        isfriend: function () {
            var friendList = Meteor.user().friendsAsUsers().fetch();
            var requestList = Meteor.user().pendingRequests().fetch();

            // Takes an array of Friends, an ID too look for
            function isFriend(array, id){
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i]._id == id) {
                        console.log("We found "+ id);
                        return true;
                    };
                };
                return false;
            };

            // Takes an array of Friend Requests, a userID too look for
            function hasRequested(array, id){
                for (var i = array.length - 1; i >= 0; i--) {
                    if (array[i].userId == id) {
                        console.log("We found "+ id);
                        return true;
                    };
                };
                return false;
            };
            
            if (isFriend(friendList, Router.current().params._id)) {
                // Does the current user have this other user in their friends list?
                return "true";
            } else {
                if (hasRequested(requestList, Router.current().params._id)) {
                    // Has the current user already requested friendship with this user?
                    return "pending"
                } else {
                    return "false";
                };
            };
        }
    });

    Template.userprofileinfo.events({
        'submit #relationship': function (event) {
            event.preventDefault();
            console.log(event);

            if (event.target[0].value == "true") {
                // Remove friend relationship
                console.log("Remove");
                Meteor.users.findOne({_id: Router.current().params._id}).unfriend();
            } else if (event.target[0].value == "false"){
                // Add friend relationship
                console.log("Add as friend");
                Meteor.users.findOne({_id: Router.current().params._id}).requestFriendship();
            } else if (event.target[0].value == "pending"){
                // Cancel Friend Request
                console.log("Cancel Friend Request");
                Meteor.users.findOne({_id: Router.current().params._id}).cancelFriendshipRequest();
            };
        }
    });

    // Gets all the data for a single tweet. Requires a data context with an object with an _id field for the specific tweet id.
    Template.tweet.helpers({
        firstname: function () {
            //console.log("tweetid: "+this._id);
            var authorID = Tweets.findOne({_id: this._id}).authorID;
            return Meteor.users.findOne({_id: authorID}).profile.firstname;
        },
        lastname: function () {
            var authorID = Tweets.findOne({_id: this._id}).authorID;
            return Meteor.users.findOne({_id: authorID}).profile.lastname;
        },
        id: function () {
            //console.log(this);
            return this._id;
        },
        createdAt: function () {
            return Tweets.findOne({_id: this._id}).createdAt;
        },
        text: function () {
            return Tweets.findOne({_id: this._id}).text;
        }
    });

    Template.friendlist.helpers({
        firstname: function () {
            return Meteor.users.findOne({_id: this._id}).profile.firstname;
        },
        lastname: function () {
            return Meteor.users.findOne({_id: this._id}).profile.lastname;
        }
    });

    Template.friendrequestlist.helpers({
        currentUser: function () {
            return Meteor.user();
        },
        firstname: function () {
            return Meteor.users.findOne({_id: this.requesterId}).profile.firstname;
        },
        lastname: function () {
            return Meteor.users.findOne({_id: this.requesterId}).profile.lastname;
        }
    });

    Template.friendrequestlist.events({
        'click [data-action=accept]': function() {
            Meteor.users.findOne({_id: this.requesterId}).acceptFriendshipRequest();
        },
        'click [data-action=deny]': function() {
            Meteor.users.findOne({_id: this.requesterId}).denyFriendshipRequest();
        },
    });
}
