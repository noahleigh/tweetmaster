if (Meteor.isServer) {
    Meteor.startup(function() {
        // code to run on server at startup

        // Set Mailgun URL
        process.env.MAIL_URL = 'smtp://postmaster@sandbox68087e2802094f588f33fa2cfa861693.mailgun.org:6f311dbe9c1535a2b15dbb29eb85cd40@smtp.mailgun.org:587';

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

    Meteor.methods({
        // This is currently unused until we can get client-server data passing to work as intended.
        'sanitizeTweets': function(input){
            // From: http://stackoverflow.com/questions/295566/sanitize-rewrite-html-on-the-client-side
            var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';

            var tagOrComment = new RegExp(
                '<(?:'
                // Comment body.
                + '!--(?:(?:-*[^->])*--+|-?)'
                // Special "raw text" elements whose content should be elided.
                + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
                + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
                // Regular name
                + '|/?[a-z]'
                + tagBody
                + ')>',
                'gi');
            //return function(input) {
              var oldHtml;
              do {
                oldHtml = input;
                input = input.replace(tagOrComment, '');
                //console.log("Iterated Input: "+input)
              } while (input !== oldHtml);
              return input.replace(/</g, '&lt;');
            //}
        },
        'sendVerificationEmail':function(userID){
            // Set up email template
            user = Meteor.user();
            Accounts.emailTemplates.siteName = "Tweetmaster";
            // Accounts.emailTemplates.from = "Tweetmaster <fake@example.com>" ;
            Accounts.emailTemplates.verifyEmail.subject = function(user){
                return "Welcome to Tweetmaster "+user.profile.firstname + " " + user.profile.lastname;
            }
            return Accounts.sendVerificationEmail(userID);
        }
    });
}