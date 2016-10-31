angular.module('app.chatroom', ['app.student'])
.controller('ChatroomController', ['$scope', '$timeout', 'Tickets', 'Auth', 'params', '$http', 'loading', 'checkStatus', '$location', function($scope, $timeout, Tickets, Auth, params, $http, loading, checkStatus, $location){
  const cookie = JSON.parse(document.cookie.substr(document.cookie.indexOf('; ') + 1));

  if(params.ticket === undefined){
    console.log(checkStatus);
    $location.path(checkStatus.check(cookie));
  }

  $scope.chatroom = [];
  $scope.ticketID = {ticketId: params.ticket.id};
  $scope.ticket = params.ticket;
  $scope.messageObj = {};
  $scope.loading = loading.loading;
  $scope.code = '';

  $scope.sniptMsg = {
    msg: '',
    cl: 'hidden'
  }

  // var updateScroll = (element) =>{
  //   console.dir(element.scrollTop, 'before')
  //   element.scrollTop = element.scrollHeight + 1000;
  //   console.dir(element.scrollTop, 'after')
  // };

  socket.on('messageAdded', () =>{
    getChatroom($scope.ticketID);
  });

  socket.on('otherTyping', (data) => {
    if (data !== cookie.user.mainId) {
      $('#gif').css('visibility', 'visible');
      _.debounce(setTimeout(()=> {
        $('#gif').css('visibility', 'hidden')
      }, 1000), 3000);
    }
  });

  socket.on('changedCode', (data) => {
    $scope.code = data;
  });

  //Post request to save ticket; server response will return all messages
  var getChatroom = (data) => {
    return $http({
      method: 'POST',
      url: '/chatroom/',
      data: data
    })
    .then((resp) => {
      $scope.loading = '';
      $scope.sniptMsg = {
        msg:'Click the code area to edit, when finished click submit.',
        cl: 'alert alert-info'
      }      

      resp.data.forEach(function(item) {
        item.createdAtUpdate = moment(item.createdAt).startOf('minute').fromNow();
        item.updatedAtUpdate = moment(item.updatedAt).startOf('hour').fromNow();
        var url = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
        var regex = new RegExp(url);
        var m = item.message;
        
        console.log("regext message: ", m.match(regex));

        if (m.match(regex)) {
          item.url=true;
          $scope.chatURL = m.match(regex)[0];
          console.log("Successful match:", item);
        } else {
          console.log("No match");
        }        
      });

    	$scope.chatroom = resp.data;
      // $scope.$digest();
    })
    .catch((err) => {
      console.log(err);
    });
  };

  //Post request to save each message
  var saveChatMessage = (data) => {
    return $http({
      method: 'POST',
      url: '/chatroom/chat',
      data: data
    })
    .then((resp) => {
      socket.emit('messageAdd', params.ticket.id);
    })
    .catch((err) => {
     console.log(err);
    });
  };

  getChatroom($scope.ticketID)

  $scope.saveChat = function() {
    $scope.messageObj = {
      message: $scope.message,
      ticketId: params.ticket.id,
      userId: cookie.user.mainId
    }
    saveChatMessage($scope.messageObj)
    $scope.message = '';
  }

  $scope.typing = function() {
    socket.emit('typing', cookie.user.mainId);
  }

  $scope.codeChange = function() {
    socket.emit('codeChange', $scope.code);
  }

  $scope.backToTickets = function() {
    $location.path(checkStatus.check(cookie));
  }

  var initText = "// Drag javascript file into code area or start typing! \n";
  var defaultMode = "javascript";

  if(window.localStorage[`myEditor${params.ticket.id}`] !== undefined) {
    initText = window.localStorage[`myEditor${params.ticket.id}`];
  }

  var editor = new CodeMirror(document.getElementById("codeArea"),
    {
      value: initText,
      theme: 'monokai',
      autoCloseBrackets: true,
      lineNumbers: true,
      tabSize: 2,
      mode: 'javascript',
      smartIndent: true,
      autofocus: true,
    });
  if (initText === "// Drag javascript file into code area or start typing! \n") {
    editor.setCursor({line: 2, ch:0});
  }


  window.localStorage[`myEditor${params.ticket.id}`] = editor.getValue();

  editor.on('change', function() {
      window.localStorage[`myEditor${params.ticket.id}`] = editor.getValue();
  });

  $scope.submitCode = function() {
    socket.emit('codeChange', window.localStorage[`myEditor${params.ticket.id}`], cookie.user.mainId);
    $scope.sniptMsg.msg = 'Code sending...';
  }

  socket.on('codeReceived', (code, id) => {
    if (id !== cookie.user.mainId) {
      window.localStorage[`myEditor${params.ticket.id}`] = code;
      editor.setValue(code);
      $scope.sniptMsg.msg = 'Code recieved!'
      $scope.sniptMsg.cl = 'alert alert-success';
      socket.emit('codeRecieved')
      $timeout(() =>{
        $scope.sniptMsg.msg = 'Click the code area to edit, when finished click submit.'
        $scope.sniptMsg.cl = 'alert alert-info';
      }, 3000)
      // Sets cursor to end of doc after edit...develop live edit later.
      // $scope.editor.setCursor($scope.editor.lineCount(), 0);
    }else{
      $scope.sniptMsg.msg = 'Code sent!';
      $scope.sniptMsg.cl = 'alert alert-success';
      $scope.$digest();
      $timeout(() =>{
        $scope.sniptMsg.msg = 'Click the code area to edit, when finished click submit.'
        $scope.sniptMsg.cl = 'alert alert-info';
      }, 3000)
    }
  });

  $scope.checkId = (chat) =>{
    if(cookie.user.username === chat.username){
      return 'userMe';
    }else {
      return 'userOther';
    }
  }

  $scope.signout = function ($location) {
    Auth.signout();
    $location.path('/signin');
  }

}])
