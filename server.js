const express = require('express');
const app = express();
const server = require('http').createServer(app);
const nodemailer = require('nodemailer');
const passport = require("passport");
const mongoose = require("mongoose");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");

require('dotenv').config();


// =====================Socket======================

const io = require('socket.io')(server);
const {
  v4: uuidV4
} = require('uuid');

// ====================Global-Variables==============


const userS = [];
userI = [];

// ============================================================================


app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.set("view engine", "ejs");
app.use(express.static("public"));


// ====================================Database==================================

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

async function run() {

  //Database connection
  const db = await mongoose.connect(`mongodb+srv://kunal-admin:${process.env.DB_SSAP}@cluster0.1nl6l.mongodb.net/users`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  //User Schema
  const userSchema = new mongoose.Schema({
    username: String,
    name: String,
    email: String,
    password: String,
    groups: [{grpId:String,name:String}]
  });

  userSchema.plugin(passportLocalMongoose);

  const User = new mongoose.model("User", userSchema);

  passport.use(User.createStrategy());

  passport.serializeUser(User.serializeUser());
  passport.deserializeUser(User.deserializeUser());

  const Schema = mongoose.Schema;

  //Group Schema
  const groupSchema = new Schema({
    grpId:String,
    name: String,
    admin: String,
    members: [{
      username: String,
      name: String
    }],
    meetLink: String,
    chat: [{
      name: String,
      message: String,
      username: String
    }]
  });

  const Group = new mongoose.model("Group", groupSchema);



  //====================================GET-ROUTES===============================

  app.get("/", (req, res) => {
    res.render("register");
  });

  app.get("/register", (req, res) => {
    res.render("register");
  });

  app.get("/login", (req, res) => {
    res.render("login");
  });

  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/login");
  })


  //Rendering chats page
  app.get("/chats", (req, res) => {
    if (req.isAuthenticated()) {
      User.findOne({
        "username": req.user.username
      }, {
        _id: 0,
        "groups": 1
      }, function(err, groupsData) {
        if (err) {
          console.log(err);
        } else {
          console.log(groupsData.groups);
          res.render("chats", {
            groupsArr: groupsData.groups,
            name: req.user.name,
            username: req.user.username
          });
        }
      })
    } else {
      res.redirect("/login");
    }
  });

  //Rendering the meeting page
  app.get('/:groupID/:organiser/:room', (req, res) => {
    if (req.isAuthenticated()) {
      let addRoomId = req.params.room;
      let groupId = req.params.groupID;
      let organiser = req.params.organiser;
      console.log(groupId);
      console.log(addRoomId);

      Group.findOne({
        "grpId": groupId
      }, {
        "members": {
          $elemMatch: {
            "username": req.user.username
          }
        }
      }, function(err, data) {
        if (err) {
          console.log(err);
        } else {
          if (data.members.length > 0) {
            console.log("user search: ", data);
            res.render('meeting', {
              roomId: addRoomId,
              name: req.user.name,
              groupID: groupId,
              username: req.user.username,
              organiser: organiser
            }); //get id from address bar and send to ejs
          } else {
            res.send("Request Denied! You are not a member of this group");
          }
        }
      });
    }
    else{
      res.send("Request Denied! Please login to continue.");
    }
  });


  //================================POST-ROUTES============================

  //Login route
  app.post("/login", (req, res) => {

    const newUser = new User({
      username: req.body.username,
      password: req.body.password
    });

    req.login(newUser, function(err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/chats");
        })
      }
    })
  });

  //Register route
  app.post("/register", (req, res) => {

    User.register({
      username: req.body.username,
      name: req.body.name,
      email: req.body.email,
      meetings: [],
      groups: []
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        // socket.emit("message", "User exists!Please login")
        // res.redirect("/register");
      } else {
        // passport.authenticate("local")(req, res, function() {
        res.redirect("/login");
        // });
      }
    })

  });


  // ============================Socket-Connection===========================

  await io.on("connection", socket => {

    // fetch all users for a group 
    app.post("/allUsers", (req, res) => {
      if (req.isAuthenticated()) {

        const users = req.body.allUsers;
        let userArr=[];
        let groupId=uuidV4();

        const meetingDetails = {
          grpId:groupId,
          title: req.body.title,
          time: req.body.time,
          date: req.body.date
        }

        if(!Array.isArray(users)){
          userArr.push(users);
        }else{
          userArr=users;
        }

        console.log("Users: ",users);

        createGroup(req.body.title, req.user.username, groupId);
        schedule(req.user.username, req.user.name, meetingDetails, userArr);


        res.redirect("/chats")
      } else {
        res.redirect("/login");
      }
    })

    console.log("connection established");

    // get all users registered in the database
    socket.on("get-all-users", () => {
      User.find({}, {
        _id: 0,
        username: 1
      }, function(err, users) {
        if (err) {
          console.log("Error in fetching all users: ", err);
        } else {
          // console.log("All users: ",users);
          socket.emit("receive-all-users", users);
        }
      });
    });

    // join a user in a particular group
    socket.on("join-group", groupID => {
      socket.join(groupID);
    });

    //fetch chats and meetlink of a particular group
    socket.on("loadChat", groupID => {
      Group.findOne({
        "grpId": groupID
      }, {
        _id: 0,
        chat: 1,
        meetLink: 1
      }, function(err, chats) {
        if (err) {
          console.log("Chats cannot be fetched" + err);
        } else {
          // console.log("Chats fetched successfully: " + chats.chat);
          if (chats != null) {
            socket.emit("render chat", chats.chat, chats.meetLink);
          }
        }
      });
    })

    //save current message of a particular group in the database
    socket.on("message", (name, username, message, groupID, roomId) => {
      console.log("inside message");
      let data = {
        name: name,
        message: message,
        username: username
      };

      Group.updateOne({
        "grpId": groupID
      }, {
        $push: {
          "chat": data
        }
      }, function(err) {
        if (err) {
          console.log("Chat failed to insert" + err);
        } else {
          console.log("Chat inserted successfully");
        }
      });

      console.log(roomId);

      //emit message to the meeting room
      io.to(roomId).emit("createMessage", message, name);

      //emit message to the group(chats page)
      io.to(groupID).emit("load-current-message", name, message, username);

    });


    //emit participants list and admin name of a particular group
    socket.on("get-participants", (groupID) => {
      Group.findOne({
        "grpId": groupID
      }, {
        _id: 0,
        members: 1,
        admin: 1
      }, function(err, data) {
        if (err) {
          console.log("Members cannot be fetched: " + err);
        } else {
          console.log("Group members: ", data.members);
          socket.emit("get-grpUserList", data.members, data.admin)
        }
      })
    })


    //adding participants to a new group
    function test(curr_user, adminName, meetingDetails, userToBeAdded, grpUserList) {
      return new Promise(async function(resolve, reject) {
        try {

          console.log("In test: ",userToBeAdded);
          let user = await User.findOne({ //checking if the participant exists in the database or not
            "username": userToBeAdded
          })

          if (!user) {
            console.log("User does not exsit");
            return;
          }

          await Group.updateOne({ //if exists, we add that user to the members of that grp
            "grpId": meetingDetails.grpId
          }, {
            $push: {
              "members": {
                username: userToBeAdded,
                name: user.name
              }
            }
          })

          grpUserList.push({
            username: userToBeAdded,
            userEmail: user.email
          });

          console.log("Participant added to the group successfully");

          await User.updateOne({ //we update the list user's group
            "username": userToBeAdded
          }, {
            $push: {
              "groups": {grpId:meetingDetails.grpId,name:meetingDetails.title}
            }
          })
          console.log("User's group added successfully");
          console.log(grpUserList);
          resolve();

        } catch (e) {
          reject(e)
        }
      })
    }

    //create a group, set admin, add participants, set email reminder for the meeting

    async function schedule(curr_user, adminName, meetingDetails, userToBeAdded) {
      try {

        console.log("In schedule: ",userToBeAdded);
        let grpUserList = [];
        //adding admin to the members list of group
        let userAdmin = await Group.updateOne({
          "grpId": meetingDetails.grpId
        }, {
          $push: {
            "members": {
              username: curr_user,
              name: adminName
            }
          }
        });

        //we update the admin group details
        await User.updateOne({
          "username": curr_user
        }, {
          $push: {
            "groups": {grpId:meetingDetails.grpId,name:meetingDetails.title}
          }
        });

        let grpAdmin = await User.findOne({
          "username": curr_user
        });

        grpUserList.push({
          username: curr_user,
          userEmail: grpAdmin.email
        });

        for (let i = 0; i < userToBeAdded.length; i++) {
          await test(curr_user, adminName, meetingDetails, userToBeAdded[i], grpUserList);
        }

        createAgenda(grpUserList);
      } catch (e) {
        console.log(e)
      }

      // =======================AGENDA FOR MEETINGS==========================

      function createAgenda(grpUserList) {
        let mailList = [];
        for (let i = 0; i < grpUserList.length; i++) {
          mailList.push(grpUserList[i].userEmail);
        }

        console.log(mailList);

        mailList.toString();

        // function setUpEmail() {
        let transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: `${process.env.HOST_EMAIL}`, //sender
            pass: `${process.env.HOST_EMAIL_SSAP}`
          }
        });

        let [year,month,day]=meetingDetails.date.split("-");
        let [hours,mins]=meetingDetails.time.split(":");

        // setup email data with unicode symbols
        let mailOptions = {
          from: `"Teams-app" <${process.env.HOST_EMAIL}>`, // sender address
          to: mailList, // members of the meeting
          subject: 'Meeting Reminder', // Subject line
          text: 'You have a meeting scheduled', // plain text body
          html: `<p>You have been added to group <strong>${meetingDetails.title}</strong> by ${adminName},</p>
                  <p>for a meeting scheduled at <strong>${hours}:${mins} on ${day}/${month}/${year}</strong><p/>
                  <p>Click here to Login- <a href="https://floating-plains-57464.herokuapp.com/login">Teams Call</a></p>` // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, function(error, response) {
          console.log('Message sent');
          transporter.close();
        });
      }
    }

    //Create group and set its Admin
    function createGroup(groupname, adminUserName, groupId) {
      //generate the meeting link
      let meetlink = `${uuidV4()}`

      const group = new Group({
        grpId:groupId,
        name: groupname,
        admin: adminUserName,
        members: [],
        meetLink: meetlink,
        chat: []
      }); //creating the group

      group.save((err) => {
        if (err) {
          console.log("Failed to create group");
        } else {

          console.log("group created successfully");
        }
      }); //saving the group to the database
    }

    //send the roomid/meetlink to chats.ejs to start a meeting
    socket.on("join-meeting", groupID => {
      Group.findOne({ //fetch the meeting link
        "grpId": groupID
      }, {
        _id: 0,
        meetLink: 1,
        admin: 1
      }, function(err, data) {
        if (err) {
          console.log(err);
        } else {
          // console.log(data.meetLink);
          console.log("Organiser: ", data.admin);
          socket.emit("meet-link", data.meetLink, data.admin); //sending the meeting link, to be embeded in the start meeting button
          // socket.emit("organiser-name", data.admin);
        }
      })
    });



    // ========================Meeting-Socket-Routes=================================

    //on joining a meeting
    socket.on('join-room', (roomId, userId, name, userName) => {

      // let userI = [];

      userS.push(socket.id); //store socketid of each user that joins the meeting
      userI.push({
        uid: userId,
        name: name,
        username: userName
      });

      console.log("room Id:- " + roomId, "userId:- " + userId);

      //new user joins the room
      socket.join(roomId);


      //let other clients in the meeting know that a new user joined
      socket.to(roomId).emit('user-connected', userId);

      //Remove User
      socket.on('removeUser', rUser => {
        console.log("User Removed" + rUser);
        //broadcast to other users that some user was removed
        socket.to(roomId).broadcast.emit('remove-User', rUser);
      });


      //on disconnection from the meeting
      socket.on('disconnect', () => {

        var i = userS.indexOf(socket.id);
        userS.splice(i, 1);
        socket.to(roomId).broadcast.emit('user-disconnected', userId);
        //update array

        userI.splice(i, 1);
      });

      //fetch the list of participants in the meeting
      socket.on('get-meeting-participants', () => {
        socket.emit('all-users-inRoom', userI);

        console.log(userI);
      });

      // hand raise
      socket.on("raise-hand-message", (message, name) => {
        io.to(roomId).emit("createMessage", message, name);
      })

    })


  }); //closing io connection body

} //end of run function



// =====================Creating Server===================

server.listen(process.env.PORT || 3000 || 5000, (err) => {
  if (err) {
    console.log("Server failed to start");
  } else {
    run();
    console.log("Server started on port 3000");
  }
});
