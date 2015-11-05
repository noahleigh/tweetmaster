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
    action: function(){
        if (!Meteor.userId()) {
            this.render('welcome');
        } else {
            this.render('home');
        }
    }
});

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
    });
}


if (Meteor.isClient) {

    // Look at the published collection of tweets, update if there are changes
    Meteor.subscribe("tweets");

    // Allow the client to get the user's name from their id (TBD)
    Meteor.subscribe("users");

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
                    lastname: lastname
                }
            }, function(err) {
                if (err) {
                    // User account creation failed
                } else {
                    // The user account has created and logged in.
                    alert("Account created succesfully!");
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
                }
            });
            return false;
        }
    });

    // Handles our logout
    Template.logout.events({
        'submit #logout': function() {
            Meteor.logout(function(err) {
                if (err) {
                    // Couldn't logout
                    alert("You have not been logged out.");
                } else {
                    // Tell the user we logged them out
                    alert("You have been logged out.");
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

    // Handles our userinfo template
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

    // Handles getting the tweets from the server to display on the feed.
    Template.tweetfeed.helpers({
        tweets: function() {
            // Gets a pointer to the Tweets collection, filtered by current user, sorted newest-first.
            return Tweets.find({authorID: Meteor.userId()}, {sort: {createdAt: -1 }})
        },});
}
