function Grid(size) {
  this.size = size;
  this.startTiles = 2;
  this.cells = new Array(size);
  
  // Pre-allocate the 2D array for better performance
  for (let x = 0; x < size; x++) {
    this.cells[x] = new Array(size).fill(null);
  }
  
  // Cache frequently accessed values
  this.maxSize = size - 1;
  this.playerTurn = true;
}

// Pre-compute indexes for better performance
Grid.prototype.indexes = Array.from({ length: 4 }, (_, x) => 
  Array.from({ length: 4 }, (_, y) => ({ x, y }))
);

// Direction vectors - stored as constants
Grid.prototype.vectors = {
  0: { x: 0, y: -1 }, // up
  1: { x: 1, y: 0 },  // right
  2: { x: 0, y: 1 },  // down
  3: { x: -1, y: 0 }  // left
};

// Optimized cell availability check
Grid.prototype.cellAvailable = function(cell) {
  return !this.cells[cell.x][cell.y];
};

// Optimized cell content retrieval
Grid.prototype.cellContent = function(cell) {
  return this.withinBounds(cell) ? this.cells[cell.x][cell.y] : null;
};

// Optimized bounds checking
Grid.prototype.withinBounds = function(position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size;
};

// Optimized available cells collection
Grid.prototype.availableCells = function() {
  const cells = [];
  for (let x = 0; x < this.size; x++) {
    for (let y = 0; y < this.size; y++) {
      if (!this.cells[x][y]) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
};

// Optimized random available cell selection
Grid.prototype.randomAvailableCell = function() {
  const cells = this.availableCells();
  return cells.length ? cells[Math.floor(Math.random() * cells.length)] : null;
};

// Optimized move function with 2048 merge restriction
Grid.prototype.move = function(direction) {
  const vector = this.vectors[direction];
  const traversals = this.buildTraversals(vector);
  let moved = false;
  let score = 0;
  let won = false;

  // Prepare tiles
  this.prepareTiles();

  // Traverse the grid in the right direction
  for (const x of traversals.x) {
    for (const y of traversals.y) {
      const cell = this.indexes[x][y];
      const tile = this.cellContent(cell);

      if (tile) {
        const positions = this.findFarthestPosition(cell, vector);
        const next = this.cellContent(positions.next);

        // Only allow merge if neither tile is 2048
        if (next && next.value === tile.value && !next.mergedFrom && 
            tile.value !== 2048) { // Add restriction for 2048 tiles
          const merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          this.cells[positions.next.x][positions.next.y] = merged;
          this.cells[tile.x][tile.y] = null;

          // Update position
          tile.updatePosition(positions.next);

          // Update score
          score += merged.value;

          // Check for win condition
          // We didnt need won condition !
          // if (merged.value === 2048) {
          //   won = true;
          // }
        } else {
          this.moveTile(tile, positions.farthest);
        }

        if (!this.positionsEqual(cell, tile)) {
          moved = true;
          this.playerTurn = false;
        }
      }
    }
  }

  return { moved, score, won };
};

// Optimized traversal building
Grid.prototype.buildTraversals = function(vector) {
  const traversals = {
    x: Array.from({ length: this.size }, (_, i) => i),
    y: Array.from({ length: this.size }, (_, i) => i)
  };

  if (vector.x === 1) traversals.x.reverse();
  if (vector.y === 1) traversals.y.reverse();

  return traversals;
};

// Optimized position finding
Grid.prototype.findFarthestPosition = function(cell, vector) {
  let previous;
  let next = { x: cell.x, y: cell.y };

  do {
    previous = next;
    next = {
      x: previous.x + vector.x,
      y: previous.y + vector.y
    };
  } while (this.withinBounds(next) && this.cellAvailable(next));

  return {
    farthest: previous,
    next: next
  };
};

// Optimized tile movement
Grid.prototype.moveTile = function(tile, cell) {
  this.cells[tile.x][tile.y] = null;
  this.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Add random tile
Grid.prototype.addRandomTile = function() {
  if (this.cellsAvailable()) {
    const value = Math.random() < 0.9 ? 2 : 4;
    const cell = this.randomAvailableCell();
    const tile = new Tile(cell, value);
    this.insertTile(tile);
  }
};

// Helper function to prepare tiles
Grid.prototype.prepareTiles = function() {
  for (let x = 0; x < this.size; x++) {
    for (let y = 0; y < this.size; y++) {
      const tile = this.cells[x][y];
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    }
  }
};