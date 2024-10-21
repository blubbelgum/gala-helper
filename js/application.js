animationDelay = 100;
minSearchTime = 100;

window.requestAnimationFrame(function () {
  const manager = new GameManager(4, KeyboardInputManager, HTMLActuator);

  // Attach event listeners to all grid cells
  const gridCells = document.querySelectorAll('.grid-cell');
  gridCells.forEach((cell, cellIndex) => {
    cell.addEventListener('click', (event) => {
      const x = cellIndex % 4;
      const y = Math.floor(cellIndex / 4);
      manager.handleCellClick(x, y);
    });
  });

  // Get existing elements
  const editModeButton = document.querySelector('#game-controls > :first-child');
  const resetButton = document.querySelector('#game-controls > :nth-child(2)');

  // Add classes to existing elements
  editModeButton.classList.add('edit-mode-button');
  resetButton.classList.add('reset-button');

  // Set up event listeners
  editModeButton.addEventListener('click', function() {
    manager.toggleEditMode();
  });

  resetButton.addEventListener('click', function() {
    manager.reset();
  });
});