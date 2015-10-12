if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });

// Code adapted from http://blog.benmcmahen.com/post/41741539120/building-a-customized-accounts-ui-for-meteor
  Template.signup.events({
    'submit #sign-up' : function(e, t){
      e.preventDefault();
      // retrieve the input field values
      var firstname = t.find('#sign-up-first-name').value;
      var lastname = t.find('#sign-up-last-name').value;
      var email = t.find('#sign-up-email').value;
      var password = t.find('#sign-up-password').value;

        // Trim and validate your fields here.... 

        // If validation passes, supply the appropriate fields to the
        // Meteor.loginWithPassword() function.
        Accounts.createUser({email: email, password: password, profile: {firstname: firstname, lastname: lastname}}, function(err){
        if (err){
          // User account creation failed
        } else{
          // The user account has created and logged in.
        }
      });
         return false; 
      }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
