const socket = io("/"); //socket connection
const videoGrid = document.getElementById('video-grid');
const userDropDown = document.getElementById('myDropdown');
const myVideo = document.createElement('video');
let muteUnmuteBtn = document.querySelector(".mute-unmute-btn");
let toggleVideoBtn = document.querySelector(".video-on-off-btn");
let screenshare = document.querySelector(".screen-share");
let fetchParticipants = document.querySelector(".fetch-meeting-participants");
let shareURL = document.querySelector(".share-link");
let handRaise = document.querySelector(".hand-raise");
let leaveMeeting = document.querySelector(".leave-meeting");

myVideo.muted = true;
let text = $('input');

let grpParticipants = [];
let peers = {},
  currentPeer = [];
let cUserPeerID;
let peersArray = [];
let conn;


console.log("organiser:", organiser);
console.log("Current user: ", YourName);

//create my peer object
var peer = new Peer();

let myVideoStream;

//get my video and audio tracks
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  addVideoStream(myVideo, stream);
  myVideoStream = stream;

  //receiving a call
  peer.on('call', call => {
    console.log("answered");

    call.answer(stream);

    const video = document.createElement('video');
    //store call information of all the callers
    peers[call.peer] = call;

    //add new user's video and audio track on my UI
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });

    currentPeer.push(call.peerConnection);

    call.on('close', function () {
      video.remove();
    });
  });

  socket.on('user-connected', (userId) => { //userconnected so we are now ready to share
    console.log('user ID fetch connection: ' + userId); //video stream
    // peersArray.push(peerDetails);
    // console.log("Peers Array: ",peersArray);
    connectToNewUser(userId, stream); //by this function which call user
  })

});


//when new user joins the meeting room
peer.on('open', async id => {
  cUserPeerID = id;
  // console.log("Current user: "+id);
  await socket.emit('join-room', ROOM_ID, id, YourName, username);

})

// close the call with the user who has disconnected
socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close();
  }
  console.log('user ID fetch Disconnect: ' + userId);

});


// call a new user
const connectToNewUser = (userId, stream) => {
  console.log('User-connected :-' + userId);
  // call the new user send our video stream
  let call = peer.call(userId, stream);

  const video = document.createElement('video');

  //receive video from the receiver and add their video to our UI
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  })
  call.on('close', () => {
    video.remove()
  })
  peers[userId] = call;
  currentPeer.push(call.peerConnection);
  console.log(currentPeer);
}

//stream my audio and video on my screen
const addVideoStream = (video, stream) => {
  video.srcObject = stream;
  video.controls = true;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  })
  videoGrid.append(video);
}

//mute/unmute
muteUnmuteBtn.addEventListener("click", function () {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    const html = `<i class="fas fa-microphone-slash" style="color:#60928e;"></i>`;
    document.querySelector('.mute-btn').innerHTML = html;
    console.log("muted");
  }
  else {
    const html = `<i class="fas fa-microphone"></i>`;
    document.querySelector('.mute-btn').innerHTML = html;
    myVideoStream.getAudioTracks()[0].enabled = true;
    console.log("unmuted")
  }
})

//video on/off toggle
toggleVideoBtn.addEventListener("click", function () {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    const html = `<i class="fas fa-video-slash" style="color:#60928e;"></i>`;
    document.querySelector('.video-btn').innerHTML = html;
    console.log("video off");
  }
  else {
    const html = `<i class="fas fa-video"></i>`;
    document.querySelector('.video-btn').innerHTML = html;
    console.log("video on");
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
})

//sharing screen usingg getDisplayMedia
screenshare.addEventListener("click", function () {
  navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always'
    },
    audio: {
      echoCancellation: true,
      noiseSupprission: true
    }

  }).then(stream => {
    let videoTrack = stream.getVideoTracks()[0];
    videoTrack.onended = function () {
      stopScreenShare();
    }
    for (let x = 0; x < currentPeer.length; x++) {

      let sender = currentPeer[x].getSenders().find(function (s) {
        return s.track.kind == videoTrack.kind;
      })

      sender.replaceTrack(videoTrack);
    }
  })
})

//stop screen share
function stopScreenShare() {
  let videoTrack = myVideoStream.getVideoTracks()[0];
  for (let x = 0; x < currentPeer.length; x++) {
    let sender = currentPeer[x].getSenders().find(function (s) {
      return s.track.kind == videoTrack.kind;
    })
    sender.replaceTrack(videoTrack);
  }
}

//hand raise
handRaise.addEventListener("click", function () {
  const sysbol = "&#9995;";
  socket.emit('raise-hand-message', sysbol, YourName);
  handsUp();
})

const handsUp = () => {
  const html = `<i class="far fa-hand-paper"></i>
                <span>Raised</span>`;
  document.querySelector('.raisedHand').innerHTML = html;
  console.log("change")
  handsDown();
}

const handsDown = () => {
  setInterval(function () {
    const html = `<i class="far fa-hand-paper"></i>
                <span>Hand</span>`;
    document.querySelector('.raisedHand').innerHTML = html;
  }, 3000);
}

//share meeting URL with other participants
shareURL.addEventListener("click", function () {
  var share = document.createElement('input'),
    text = window.location.href;

  console.log(text);
  document.body.appendChild(share);
  share.value = text;
  share.select();
  document.execCommand('copy');
  document.body.removeChild(share);
  alert('Copied');
})

//fetch list of current participants in the meeting
fetchParticipants.addEventListener("click", function () {
  socket.emit('get-meeting-participants');
})


socket.on('all-users-inRoom', (userI) => {
  console.log("users in the room: ", userI);
  // userlist.splice(0,userlist.length);
  let userlist = [];
  userlist = userI;
  console.log(userlist);
  listOfUser(userlist);
  document.getElementById("myDropdown").classList.toggle("show");
});

const listOfUser = (userlist) => {
  userDropDown.innerHTML = '';

  for (var i = 0; i < userlist.length; i++) {
    var x = document.createElement("a");
    var t = document.createTextNode(userlist[i].username == organiser ? `${userlist[i].name} (organiser)` : `${userlist[i].name}`);
    x.appendChild(t);
    userDropDown.append(x);
  }
  const anchors = document.querySelectorAll('a');
  for (let i = 0; i < anchors.length; i++) {
    anchors[i].addEventListener('click', () => {
      console.log(`Link is clicked ${i}`);
      if (username == organiser) {
        anchoreUser(userlist[i].uid);
      }
    });
  }
}

const anchoreUser = (userR) => {
  socket.emit('removeUser', userR);
}

//remove participants
socket.on('remove-User', (userR) => {
  if (cUserPeerID == userR) {
    window.location = "/chats";
  }
});

//leave meeting
leaveMeeting.addEventListener("click", function () {
  window.location = "/chats";
})




// render previous Chats
socket.emit("loadChat", groupID);

//display previous chats on the UI
socket.on("render chat", (data) => {
  console.log(data);
  const chats = data;
  $('ul').innerHTML = "";

  chats.forEach(function (chat) {
    let div = document.createElement("div");
    div.innerHTML = `<li class="message">
    <p style="color:#60928e;" class="user-name">${chat.name}</p>
    <p style="color:black;word-break:break-all;" class="user-msg">${chat.message}</p>
    </li>
    <br>`

    $('ul').append(div);
    scrollToBottom();
  });
});

//emit message from the meeting room
$('html').keydown((e) => {
  if (e.which == 13 && text.val().length !== 0) {
    console.log(text.val());
    socket.emit("message", YourName, username, text.val(), groupID, ROOM_ID);
    text.val('')
  }
});


//display current sg on the UI
socket.on('createMessage', (msg, user) => {
  $('ul').append(`<li class="message">
  <p style="color:#60928e;" class="user-name">${user}</p>
  <p style="color:black;word-break:break-all;" class="user-msg">${msg}</p>
  </li>
  <br>`);
  scrollToBottom();
});


const scrollToBottom = () => {
  var d = $('.main-chat-window');
  d.scrollTop(d.prop("scrollHeight"));
}

console.log("peers", peers);
