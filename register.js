const playerNameKey='cosmos-player-name';
const playerNameInput=document.getElementById('playerNameInput');
const startGameButton=document.getElementById('startGameButton');

playerNameInput.value=localStorage.getItem(playerNameKey)||'';
playerNameInput.focus();

function startGame(){
  const name=playerNameInput.value.trim();
  if(!name){
    playerNameInput.focus();
    return;
  }

  localStorage.setItem(playerNameKey, name);
  window.location.href='game.html';
}

startGameButton.addEventListener('click', startGame);
playerNameInput.addEventListener('keydown', (event)=>{
  if(event.key=='Enter'){
    startGame();
  }
});
