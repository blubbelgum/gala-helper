function HTMLActuator() {
  this.tileContainer    = document.getElementsByClassName("tile-container")[0];
  this.scoreContainer   = document.getElementsByClassName("score-container")[0];
  this.messageContainer = document.getElementsByClassName("game-message")[0];
  this.sharingContainer = document.getElementsByClassName("score-sharing")[0];

  this.editModeContainer = document.querySelector(".edit-mode-container");
  this.resetButton = document.querySelector(".reset-button");

  this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

    self.updateEditModeStatus(metadata.editMode);
  });
};

HTMLActuator.prototype.restart = function () {
  if (ga) ga("send", "event", "game", "restart");
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);

  // Add click event listener for upgrading tile value
  if (tile.isNew) {
    // add border to new tiles
    wrapper.style.border = '2px solid greenyellow';
    wrapper.addEventListener('click', function() {
      if (tile.value < 2048) {
        tile.value *= 2;
        inner.textContent = tile.value;
        wrapper.className = wrapper.className.replace(/tile-\d+/, 'tile-' + tile.value);
        tile.isNew = false;
        // wrapper.style.border = 'none';
      }
    });
  }
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!"

  // if (ga) ga("send", "event", "game", "end", type, this.score);

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;

  this.clearContainer(this.sharingContainer);
  this.sharingContainer.appendChild(this.scoreTweetButton());
  twttr.widgets.load();
};

HTMLActuator.prototype.clearMessage = function () {
  this.messageContainer.classList.remove("game-won", "game-over");
};


HTMLActuator.prototype.showHint = function(hint) {
  document.getElementById('feedback-container').innerHTML = ['↑','→','↓','←'][hint];
}

HTMLActuator.prototype.setRunButton = function(message) {
  document.getElementById('run-button').innerHTML = message;
}

HTMLActuator.prototype.updateEditModeStatus = function(isEditMode) {
  if (this.editModeContainer) {
    this.editModeContainer.textContent = isEditMode ? "Edit Mode: ON" : "Edit Mode: OFF";
  }
};

HTMLActuator.prototype.setEditMode = function(isEditMode) {
  if (isEditMode) {
    this.tileContainer.classList.add("edit-mode");
  } else {
    this.tileContainer.classList.remove("edit-mode");
  }
  this.updateEditModeStatus(isEditMode);
};

HTMLActuator.prototype.setEditMode = function(isEditMode) {
  if (isEditMode) {
    this.editModeContainer.textContent = "Edit Mode: ON";
    document.body.classList.add("edit-mode");
  } else {
    this.editModeContainer.textContent = "Edit Mode: OFF";
    document.body.classList.remove("edit-mode");
  }
};