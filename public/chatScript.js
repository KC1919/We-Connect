const socket = io();

let participants = [];
let roomID;

let sendButton = document.querySelector(".send-btn");
let ul = document.querySelector(".chatList");
let groupNamesDiv = document.querySelectorAll(".chat-name");
let currentGroup = document.querySelector(".currentGroup");
let groupNames = document.querySelectorAll(".groupNames")
let chatContainer = document.querySelector(".chat-container");
let addGroups = document.querySelector(".chat-add-icon");
let addParticipant = document.querySelector(".add-user-btn");
let startMeeting = document.querySelector(".join-btn");
let getParticipantBtn = document.querySelector(".add-participants");
let participantList = document.querySelector(".participant-list");
let addUser = document.querySelector(".add-user");
let addChat = document.querySelector(".new-chat-icon");
let sendBtn = document.querySelector(".send-icon");
let submitForm = document.querySelector(".submit-form");
let firstGroupId = document.querySelector(".currentGroup").getAttribute("data-grpID");

let currGrpUsers = [];
let currentGroupId;

let currUser = name;

currentGroupId = firstGroupId;

//===================================================================


  // ------------button event listeners for styling-------------------

  // for add user icon
  addUser.addEventListener("mouseover", function () {
    addUser.src = "/images/viewUsers-hover.png";
  })

  addUser.addEventListener("mouseout", function () {
    addUser.src = "/images/viewUsers.png";
  })

  // for add chat icon
  addChat.addEventListener("mouseover", function () {
    addChat.src = "/images/new-chat-hover.png";
  })

  addChat.addEventListener("mouseout", function () {
    addChat.src = "/images/new-chat.png";
  })

  // for send msg btn
  sendBtn.addEventListener("mouseover", function () {
    sendBtn.src = "/images/send-hover.png";
  })

  sendBtn.addEventListener("mouseout", function () {
    sendBtn.src = "/images/send.png";
  })


  // -----------creating meeting groups modal container---------------------

  $(".chosen-select").chosen({
    no_results_text: "Oops, nothing found!"
  })

  let addConversation = document.querySelector(".chat-add-icon");
  let modalContainer = document.querySelector(".modal-container");

  // creating new meeting groups
  addConversation.addEventListener("click", function () {
    if (modalContainer.style.display == "none") {
      socket.emit("get-all-users");
    } else {
      modalContainer.style.display = "none";
    }
  })

  //request to fetch all users in the database
  socket.on("receive-all-users", (data) => {
    let ul = document.querySelector(".checkbox-list");

    ul.innerHTML = "";
    console.log("All users fetched: ", data);

    data.forEach(function (user) {
      if (user.username != username) {
        let li = document.createElement("li");
        li.innerHTML = `<input name="allUsers" type="checkbox" value="${user.username}" />${user.username}`;
        li.className = "checkbox-elements";
        // `<li class="checkbox-elements"><input type="checkbox" />${user.username}</li>`
        console.log(user.username);
        ul.append(li);
        // li.innerHTML = "";
      }
    });
    modalContainer.style.display = "block";
  });



  var checkList = document.getElementById('list1');
  checkList.getElementsByClassName('anchor')[0].onclick = function (evt) {
    if (checkList.classList.contains('visible'))
      checkList.classList.remove('visible');
    else
      checkList.classList.add('visible');
  }

  //meeting group form validation

  function validate(btn){
    let titleInput=document.querySelector(".title").value;
    let dateInput=document.querySelector(".date").value;
    let timeInput=document.querySelector(".time").value;
    let form=document.querySelector(".scheduleForm");

    if(titleInput=="" || dateInput=="" || timeInput==""){
      alert("All input fields required");
    }
    else{
      form.action="/allUsers";
      form.method="post"
      form.submit();
      console.log("Reached else");
      modalContainer.style.display = "none";
      setTimeout(delayAlert, 500);

      function delayAlert() {
        alert("Meeting created successfully, participants will be notified via email");
      }
    }
  }



// ============================================================================

// fetch chats of first group by default
if (currentGroupId == "") {
  console.log(currentGroupId);
  setTimeout(function () {
    alert("Click on the plus icon in the left to start a conversation and join meetings");
  }, 2000);
}
else {
  socket.emit("join-group", firstGroupId);
  socket.emit("loadChat", firstGroupId);

}



// load groupp chats when a group name is clicked
for (let i = 0; i < groupNamesDiv.length; i++) {
  groupNamesDiv[i].addEventListener("click", function () {
    currentGroup.innerText = groupNames[i].innerHTML;

    console.log("Group id: ", groupNames[i].getAttribute("data-grpID"));

    currentGroupId = groupNames[i].getAttribute("data-grpID");

    socket.emit("join-group", currentGroupId);
    socket.emit("loadChat", currentGroupId);

  });
}

// this event is fired when any chat needs to be rendered(when a grp is clicked)
socket.on("render chat", (chats, roomId) => {
  console.log(chats);
  roomID = roomId;
  ul.innerHTML = "";

  //display previous chats on the UI
  chats.forEach(function (chat) {

    let div = document.createElement("div");

    if (chat.username == username) {
      div.innerHTML = `<li class="right message">
        <p class="user-name">${chat.name}</p>${chat.message}
    </li><br>`
    }
    else {
      div.innerHTML = `<li class="left message">
      <p class="user-name">${chat.name}</p>${chat.message}
  </li><br>`
    }


    ul.append(div);
    scrollToBottom(chatContainer);
  });
});

const scrollToBottom = (node) => {
  node.scrollTop = node.scrollHeight;
}

// display current msg on the UI
socket.on("load-current-message", (sender, msg, userName) => {
  let div = document.createElement("div");

  console.log("username");
  if (username == userName) {
    div.innerHTML = `<li class="right message">
        <p class="user-name">${sender}</p>${msg}
    </li><br>`
  } 
  else {
    div.innerHTML = `<li class="left message">
        <p class="user-name">${sender}</p>${msg}
    </li><br>`
  }

  ul.append(div);
  scrollToBottom(chatContainer);
})

//Send message on enter key
$('html').keydown((e) => {
  let inputMessage = document.querySelector(".chat-input");
  if (e.which == 13 && inputMessage.value != "") {
    socket.emit("message", currUser, username, inputMessage.value, currentGroupId, roomID);
    inputMessage.value = "";
  }
})

//emit msg when send btn is clicked
sendButton.addEventListener("click", function () {
  let inputMessage = document.querySelector(".chat-input");

  if (inputMessage.value != "") {
    console.log(inputMessage.value);
    console.log(currUser);
    socket.emit("message", currUser, username, inputMessage.value, currentGroupId, roomID);
  } else {
    console.log("Nothing to send");
  }
  inputMessage.value = "";
})

//clear the previous chats on the UI on reload
socket.on("reload", function () {
  ul.innerHTML = "";
})

//emit a join meeting event when is join meeting btn is clicked
startMeeting.addEventListener("click", function () {
  if (currentGroupId == "") {
    alert("You do not have any groups to start a meeting. Click on the plus icon on the left to start a conversation.");
  }
  else {
    socket.emit("join-meeting", currentGroupId);
  }

});

//fetch the meet link of the current grp and load the meeting page
socket.on("meet-link", (link, organiser) => {
  let linkbtn = document.createElement("a");
  linkbtn.setAttribute("href", "/" + currentGroupId + "/" + organiser + "/" + link);
  linkbtn.click();
});

// Get a group's participants list
getParticipantBtn.addEventListener("click", function () {

  if (participantList.style.display == "block") {
    participantList.style.display = "none";
  }
  else {
    if(currentGroupId != "")
    socket.emit("get-participants", currentGroupId);
  }
})

//display group memebrs when view participants btn is clicked
socket.on("get-grpUserList", (grpMembers, admin) => {

  participantList.innerHTML = "";
  grpMembers.forEach(function (member) {
    let div = document.createElement("div");
    div.className = "member-details";

    if (member.username == admin) {
      div.innerHTML = `<p class="member-name">${member.name} (Admin)</p>
    <p class="member-username">${member.username}</p>`
    }
    else {
      div.innerHTML = `<p class="member-name">${member.name}</p>
    <p class="member-username">${member.username}</p>`
    }
    participantList.append(div);
  })

  participantList.style.display = "block";

  console.log("Group Members: ", grpMembers);
  console.log(admin);
});


//mouse up event listener
document.addEventListener('mouseup', function (e) {
  if (!participantList.contains(e.target)) {
    participantList.style.display = 'none';
  }
});