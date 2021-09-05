# Teams call

Built as a part of Microsoft Engage 2021 Program

[Live Project](https://teams-calling.herokuapp.com)

[Documentation](https://docs.google.com/document/d/1W2hogJ3US0u-PmkSGjt7UnJPM1zQZTF687CGzfur5yQ/edit#heading=h.sf86nweplnlb)

[Demo](https://www.youtube.com/watch?v=uw6qzEavzD0)

# Overview
A Video calling web application which lets users register and create meeting groups for real time chatting and video calling. It lets users schedule meetings and send email notifications. The video call interface has features like media controls, screen share and admin has been given the right to remove participants from the meeting.

# Tech Stack
Frontend: EJS, CSS, JavaScript

Backend: Node.js, Express.js

Database: MongoDB (for storing user data, groups data, chats etc.)

Packages Used:  socket.io, nodemailer, passportjs, passport local session, express session, passport local mongoose, uuidv4

APIs Used: Peerjs (WebRTC library), MediaStream API

Deployed to: Heroku

# Features
## User Authentication
User authentication is handled by Passport.js. All the routes are secure and cannot be accessed without authenticating the user. A session remains active as long as the browser is open.

## Group Conversations
Group conversations work similar to the Microsoft Teams App. It has the following features:

1. **Schedule Meeting** - Users can schedule/create new meeting groups.
2. **Add Participants** - The admin can add participants to the group from the list of registered users that are fetched from the database.
3. **Email Notifications** - When a new meeting group is scheduled, all the participants are notified via an email notification.
4. **Exclusive Video Calls (Private)** - Real Time Chat and Video Calling (with Privacy). Each group has its unique meeting room. Only group members are authenticated to join that group’s video call meeting. This is done to maintain the privacy of group meetings.
6. **Real Time Chat** - Chat messages are transmitted to and fro in real time between the group conversation and its corresponding meeting room.
7. **Chats saved in database** - All the chats are saved in the database and users can see their groups and corresponding chats when they login again.
8. **View Members of Group** - Users can view the participants list of any of their groups.

## Video Call Meetings
Video Call Meetings have the following features:

1. **Video/Audio Toggle**
2. **Privacy:** Only the participants of the group have the permission to join that particular group’s meeting. No outsider can intrude on the meeting.
3. **Real Time Chat:** Meeting Participants can send messages in real time. The messages in the meeting room are in sync with the group’s chat section, just like Microsoft Teams. Any member of the group who has not joined the meeting can also chat in real time with the members who have joined in the meeting.
4. **Raise Hand**
5. **Screen Share**
6. **Admin Rights:** The Organiser/Admin of the meeting has the right to remove users from the meeting.
7. **Meeting Link Sharing**

# Local Setup
Run the following commands:

`npm install` (to install all the dependencies)

`node server.js` (to start the server)
