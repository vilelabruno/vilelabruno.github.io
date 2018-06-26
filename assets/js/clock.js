var clock = document.getElementById('clock');

setInterval(function(){
  clock.innerHTML = getCurrentTime();
}, 1);

function getCurrentTime() {
  var currentDate = new Date();
  var hours = currentDate.getHours();
  hours === 0 ? hours = 12 : hours = hours;
  var minutes = currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : currentDate.getMinutes();
  var seconds = currentDate.getSeconds() < 10 ? '0' + currentDate.getSeconds() : currentDate.getSeconds();
  var currentTime = hours + 'h' + minutes;
  return currentTime;
}