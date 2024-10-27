function GameManager(size, InputManager, Actuator) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.actuator     = new Actuator;

  this.running      = false;
  this.computerGenerateTile = false;
  this.editMode = false; // Initialize editMode as false

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));

  this.inputManager.on('think', function() {
    var best = this.ai.getBest();
    if (best && best.move !== undefined) {
      this.actuator.showHint(best.move);
    } else {
      console.error('Error: best.move is undefined');
    }
    // var best = this.ai.getBest();
    // this.actuator.sh/owHint(best.move);
  }.bind(this));

  this.inputManager.on('toggleEditMode', function() {
    this.editMode = !this.editMode;
    this.actuator.setEditMode(this.editMode);
  }.bind(this))

  this.inputManager.on('reset', this.reset.bind(this));

  this.inputManager.on('run', function() {
    if (this.running) {
      this.running = false;
      this.computerGenerateTile = false;
      this.actuator.setRunButton('Auto-run');
    } else {
      this.running = true;
      this.computerGenerateTile = true;
      this.run()
      this.actuator.setRunButton('Stop');
    }
  }.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.restart();
  this.running = false;
  this.actuator.setRunButton('Auto-run');
  this.setup();
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid         = new Grid(this.size);
  // INFO: this is where the game starts & the grid is created with 2 random tiles
  // we disable this to allow for custom grids
  // this.grid.addStartTiles();

  // this.ai           = new AI(this.grid);
  // using SmartAI instead of basic AI
  this.ai           = new SmartAI(this.grid);

  this.score        = 0;
  this.over         = false;
  this.won          = false;

  // Update the actuator
  this.actuate();
};

// NEW FUNCTION: Set up the game with a custom grid
GameManager.prototype.setCustomGrid = function (customGrid) {
  this.grid = new Grid(this.size); // Create a new empty grid
  for (var i = 0; i < customGrid.length; i++) {
    for (var j = 0; j < customGrid[i].length; j++) {
      if (customGrid[i][j] > 0) {
        // Correct the coordinates by swapping i and j
        var tile = new Tile({ x: j, y: i }, customGrid[i][j]);
        this.grid.insertTile(tile);  // Insert the tile into the grid
      }
    }
  }

  this.ai = new SmartAI(this.grid);  // Initialize AI with the custom grid
  // this.ai = new AI(this.grid);  // Initialize AI with the custom grid

  this.score = 0;
  this.over  = false;
  this.won   = false;

  // Update the actuator with the new custom grid
  this.actuate();
};


// New method to handle cell clicks
GameManager.prototype.handleCellClick = function (x, y) {

  if (this.editMode) {
    if (this.grid.cellOccupied({ x: x, y: y })) {
      this.grid.removeTile({ x: x, y: y });
    } else {
      const value = 2;
      const tile = new Tile({ x: x, y: y }, value);
      this.grid.insertTile(tile);
    }
  } else {
    if (this.grid.cellOccupied({ x: x, y: y })) {
      const tile = this.grid.cellContent({ x: x, y: y });
      if (tile.value < 2048) {
        tile.value *= 2;
        // Instead of addClass, we'll handle this in the HTMLActuator
        tile.isNew = true;
      }
    } else {
      const value = 2;
      const tile = new Tile({ x: x, y: y }, value);
      this.grid.insertTile(tile);
      tile.isNew = true;
    }
  }
  this.actuate();

};


// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  this.actuator.actuate(this.grid, {
    score: this.score,
    over:  this.over,
    won:   this.won,
  });
};

// Update the move method to ensure new tiles are considered
// Update the move function to log each move
GameManager.prototype.move = function(direction) {

  if(this.computerGenerateTile) {
    this.grid.computerMove();
  } else {
    this.grid.skipComputerMove(); // <-- this function gonna skip any ComputerMove !
  }

  if (!this.grid.movesAvailable()) {
    this.over = true;
  }

  this.actuate();
};

// moves continuously until game is over
GameManager.prototype.run = function() {
  var best = this.ai.getBest();
  this.move(best.move);
  var timeout = animationDelay;
  if (this.running && !this.over && !this.won) {
    var self = this;
    setTimeout(function(){
      self.run();
    }, timeout);
  }
}

GameManager.prototype.toggleEditMode = function () {
  this.editMode = !this.editMode;
  this.actuator.setEditMode(this.editMode);
};

GameManager.prototype.reset = function () {
  this.setup();
  this.actuate();
};