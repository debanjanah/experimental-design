var state = {
  NONE: 0,
  INSTRUCTIONS: 1,
  SHAPES: 2,
  PLACEHOLDERS: 3,
};

var ctx = {
  w: 800,
  h: 600,

  trials: [],
  participant: "",
  startBlock: 0,
  startTrial: 0,
  cpt: 0, // Current Trial Index

  participantIndex: "ParticipantID",
  practiceIndex: "Practice",
  blockIndex: "Block1",
  trialIndex: "Block2",
  differenceTypeIndex: "DT",
  objectsCountIndex: "OC",

  state: state.NONE,
  targetIndex: 0,
  startTime: 0,
  errorCount: 0, // Error count for the current trial
  currentSet: {
      block1: null,
      block2: null,
      dt: null,
      oc: null
  },

  // Store the current trial parameters to restart from the same trial
  currentTrialParameters: {
      differenceType: null,
      objectCount: null
  },

  // loggedTrials is a 2-dimensional array where we store our trial-level log file
  loggedTrials: [["DesignName", "ParticipantID", "TrialID", "Block1", "Block2", "DT", "OC", "visualSearchTime", "ErrorCount"]]

};

/****************************************/
/********** LOAD CSV DESIGN FILE ********/
/****************************************/

var loadData = function (svgEl) {
  // d3.csv parses a csv file...
  d3.csv("design_data.csv").then(function (data) {
      // ... and turns it into a 2-dimensional array where each line is an array indexed by the column headers
      ctx.trials = data;

      var participant = "";
      var options = [];

      for (var i = 0; i < ctx.trials.length; i++) {
          if (!(ctx.trials[i][ctx.participantIndex] === participant)) {
              participant = ctx.trials[i][ctx.participantIndex];
              options.push(participant);
          }
      }

      var select = d3.select("#participantSel")
          .selectAll("option")
          .data(options)
          .enter()
          .append("option")
          .text(function (d) { return d; });

      setParticipant(options[0]);

  }).catch(function (error) { console.log(error) });
};

/****************************************/
/************* RUN EXPERIMENT ***********/
/****************************************/

var startExperiment = function (event) {
  event.preventDefault();

  ctx.errorCount = 0; // Reset error count at the start of a trial set
  // Reset trials
  ctx.loggedTrials = [["DesignName", "ParticipantID", "TrialID", "Block1", "Block2", "DT", "OC", "visualSearchTime", "ErrorCount"]]

  // set the trial counter to the first trial to run
  // ctx.participant, ctx.startBlock and ctx.startTrial contain values selected in combo boxes
  for (var i = 0; i < ctx.trials.length; i++) {
      if (ctx.trials[i][ctx.participantIndex] === ctx.participant) {
          if (parseInt(ctx.trials[i][ctx.blockIndex]) == ctx.startBlock) {
              if (parseInt(ctx.trials[i][ctx.trialIndex]) == ctx.startTrial) {
                  ctx.cpt = i - 1;

                  // start first trial
                  console.log("start experiment at " + ctx.cpt);
                  nextTrial();
                  return;
              }
          }
      }
  }
};

var nextTrial = function () {
  ctx.cpt++;

  if (ctx.cpt >= ctx.trials.length || ctx.trials[ctx.cpt][ctx.participantIndex] !== ctx.participant) {
      alert("Experiment finished for this participant!");
      return;
  }

  // Determine if the current trial is part of a new set.
  var block1 = ctx.trials[ctx.cpt][ctx.blockIndex];
  var block2 = ctx.trials[ctx.cpt][ctx.trialIndex];
  var dt = ctx.trials[ctx.cpt][ctx.differenceTypeIndex];
  var oc = ctx.trials[ctx.cpt][ctx.objectsCountIndex];

  if (ctx.currentSet.block1 !== block1 || ctx.currentSet.block2 !== block2 || ctx.currentSet.dt !== dt || ctx.currentSet.oc !== oc) {
      // New set, show instructions.
      ctx.currentSet.block1 = block1;
      ctx.currentSet.block2 = block2;
      ctx.currentSet.dt = dt;
      ctx.currentSet.oc = oc;

      ctx.currentTrialParameters.differenceType = dt; //Store parameters for the current
      ctx.currentTrialParameters.objectCount = oc; //Store parameters for the current
      displayInstructions();
      return;
  }


  // Prepare the variables for the new trial to call it directly
  ctx.currentTrialParameters.differenceType = dt;
  ctx.currentTrialParameters.objectCount = oc;

  displayShapes();
};

var displayInstructions = function () {
  ctx.state = state.INSTRUCTIONS;

  d3.select("#sceneCanvas").selectAll("*").remove(); // Clear shapes if any

  d3.select("#instructionsCanvas")
      .append("div")
      .attr("id", "instructions")
      .classed("instr", true);

  d3.select("#instructions")
      .append("p")
      .html("Multiple shapes will get displayed.<br> Only <b>one shape</b> is different from all other shapes.");

  d3.select("#instructions")
      .append("p")
      .html("1. Spot it as fast as possible and press <code>Space</code> bar;");

  d3.select("#instructions")
      .append("p")
      .html("2. Click on the placeholder over that shape.");

  d3.select("#instructions")
      .append("p")
      .html("Press <code>Enter</code> key when ready to start.");
};

var displayShapes = function () {
  ctx.state = state.SHAPES;
  ctx.startTime = Date.now(); // Start the timer

  d3.select("#instructionsCanvas").selectAll("*").remove(); // clear instructions if any
  d3.select("#sceneCanvas").selectAll("*").remove();

  var differenceType = ctx.currentTrialParameters.differenceType; // This is now referencing the stored DT and OC from the same trial
  var oc = ctx.currentTrialParameters.objectCount; // This is now referencing the stored DT and OC from the same trial
  var objectCount = 0;

  if (oc === "Low") {
      objectCount = 9;
  } else if (oc === "Medium") {
      objectCount = 25;
  } else {
      objectCount = 49;
  }

  console.log("display shapes for condition " + objectCount + "," + differenceType);

  var svgElement = d3.select("#sceneCanvas").append("svg");
  svgElement.attr("width", ctx.w);
  svgElement.attr("height", ctx.h)
      .classed("centered", true);

  var group = svgElement.append("g")
      .attr("id", "shapes")
      .attr("transform", "translate(100,100)");

  // 1. Decide on the visual appearance of the target and the others
  var randomNumber1 = Math.random();
  var randomNumber2 = Math.random();
  var targetSize, targetOpacity;
  var baseSize = 40;
  var baseOpacity = 0.6;

  if (differenceType.includes("Size")) {
      if (randomNumber1 > 0.5) {
          targetSize = baseSize * 1.4; // target is large
      } else {
          targetSize = baseSize * 0.6; // target is small
      }
  } else {
      targetSize = baseSize;
  }

  if (differenceType.includes("Opacity")) {
      if (randomNumber2 > 0.5) {
          targetOpacity = baseOpacity * 1.4;
      } else {
          targetOpacity = baseOpacity * 0.6;
      }
  } else {
      targetOpacity = baseOpacity
  }

  // 2. Set the visual appearance of all other objects
  var objectsAppearance = [];
  for (var i = 0; i < objectCount - 1; i++) {
      var size, opacity
      if (differenceType.includes("Size")) {
          if (targetSize > baseSize) {
              size = baseSize * 0.6
          } else {
              size = baseSize * 1.4
          }
      } else {
          size = baseSize
      }

      if (differenceType.includes("Opacity")) {
          if (targetOpacity > baseOpacity) {
              opacity = baseOpacity * 0.6
          } else {
              opacity = baseOpacity * 1.4
          }
      } else {
          opacity = baseOpacity
      }
      objectsAppearance.push({
          size: size,
          opacity: opacity
      });
  }


  // 3. Shuffle the list of objects and add the target at a random index
  shuffle(objectsAppearance);
  ctx.targetIndex = Math.floor(Math.random() * objectCount);
  objectsAppearance.splice(ctx.targetIndex, 0, { size: targetSize, opacity: targetOpacity });

  // 4. Draw the shapes on the grid
  var gridCoords = gridCoordinates(objectCount, 60);

  for (var i = 0; i < objectCount; i++) {
      group.append("circle")
          .attr("cx", gridCoords[i].x)
          .attr("cy", gridCoords[i].y)
          .attr("r", objectsAppearance[i].size / 2)
          .attr("fill", "black")
          .attr("opacity", objectsAppearance[i].opacity);
  }

}

var displayPlaceholders = function () {
  ctx.state = state.PLACEHOLDERS;

  d3.select("#shapes").remove(); // Remove shapes
  var oc = ctx.currentTrialParameters.objectCount; // This is now referencing the stored DT and OC from the same trial
  var objectCount = 0;

  if (oc === "Low") {
      objectCount = 9;
  } else if (oc === "Medium") {
      objectCount = 25;
  } else {
      objectCount = 49;
  }

  var svgElement = d3.select("svg");
  var group = svgElement.append("g")
      .attr("id", "placeholders")
      .attr("transform", "translate(100,100)");

  var gridCoords = gridCoordinates(objectCount, 60);
  for (var i = 0; i < objectCount; i++) {
      var placeholder = group.append("rect")
          .attr("x", gridCoords[i].x - 28)
          .attr("y", gridCoords[i].y - 28)
          .attr("width", 56)
          .attr("height", 56)
          .attr("fill", "Gray")
          .attr("data-index", i);


      placeholder.on("click", function () {
          var clickedIndex = parseInt(d3.select(this).attr("data-index"));

          if (clickedIndex === ctx.targetIndex) {
              // Correct selection
              var endTime = Date.now();
              var visualSearchTime = endTime - ctx.startTime;

              // Log the data
              var trialData = [
                  ctx.trials[ctx.cpt]["DesignName"],
                  ctx.trials[ctx.cpt][ctx.participantIndex],
                  ctx.trials[ctx.cpt]["TrialID"],
                  ctx.trials[ctx.cpt][ctx.blockIndex],
                  ctx.trials[ctx.cpt][ctx.trialIndex],
                  ctx.trials[ctx.cpt][ctx.differenceTypeIndex],
                  ctx.trials[ctx.cpt][ctx.objectsCountIndex],
                  visualSearchTime,
                  ctx.errorCount
              ];

              ctx.loggedTrials.push(trialData);

              // Prepare for the next trial
              d3.select("#placeholders").remove();
              nextTrial();
          } else {
              // Incorrect selection - restart trial
              ctx.errorCount++;
              d3.select("#placeholders").remove();
              displayShapes(); //Restart the trial
          }
      });
  }
}

var keyListener = function (event) {
  event.preventDefault();

  if (ctx.state == state.INSTRUCTIONS && event.code == "Enter") {
      d3.select("#instructions").remove();
      displayShapes();
  }

  // TODO step 1-a
  if (ctx.state == state.SHAPES && event.code == "Space") {
      displayPlaceholders();
  }

}

var downloadLogs = function (event) {
  event.preventDefault();
  var csvContent = "data:text/csv;charset=utf-8,";
  console.log("logged lines count: " + ctx.loggedTrials.length);
  ctx.loggedTrials.forEach(function (rowArray) {
      var row = rowArray.join(",");
      csvContent += row + "\r\n";
      console.log(rowArray);
  });
  var encodedUri = encodeURI(csvContent);
  var downloadLink = d3.select("form")
      .append("a")
      .attr("href", encodedUri)
      .attr("download", "logs_" + ctx.trials[ctx.cpt][ctx.participantIndex] + "_" + Date.now() + ".csv")
      .text("logs_" + ctx.trials[ctx.cpt][ctx.participantIndex] + "_" + Date.now() + ".csv");
}


// returns an array of coordinates for laying out objectCount objects as a grid with an equal number of lines and columns
function gridCoordinates(objectCount, cellSize) {
  var gridSide = Math.sqrt(objectCount);
  var coords = [];
  for (var i = 0; i < objectCount; i++) {
      coords.push({
          x: (i % gridSide) * cellSize,
          y: Math.floor(i / gridSide) * cellSize
      });
  }
  return coords;
}

// shuffle the elements in the array
// copied from https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle(array) {
  var j, x, i;
  for (i = array.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = array[i];
      array[i] = array[j];
      array[j] = x;
  }
  return array;
}

/*********************************************/

var createScene = function () {
  var svgEl = d3.select("#sceneCanvas").append("svg");
  svgEl.attr("width", ctx.w);
  svgEl.attr("height", ctx.h)
      .classed("centered", true);

  loadData(svgEl);
};


/****************************************/
/******** STARTING PARAMETERS ***********/
/****************************************/

var setTrial = function (trialID) {
  ctx.startTrial = parseInt(trialID);
}

var setBlock = function (blockID) {
  ctx.startBlock = parseInt(blockID);

  var trial = "";
  var options = [];

  for (var i = 0; i < ctx.trials.length; i++) {
      if (ctx.trials[i][ctx.participantIndex] === ctx.participant) {
          if (parseInt(ctx.trials[i][ctx.blockIndex]) == ctx.startBlock) {
              if (!(ctx.trials[i][ctx.trialIndex] === trial)) {
                  trial = ctx.trials[i][ctx.trialIndex];
                  options.push(trial);
              }
          }
      }
  }

  var select = d3.select("#trialSel");

  select.selectAll("option")
      .data(options)
      .enter()
      .append("option")
      .text(function (d) { return d; });

  setTrial(options[0]);

}

var setParticipant = function (participantID) {
  ctx.participant = participantID;

  var block = "";
  var options = [];

  for (var i = 0; i < ctx.trials.length; i++) {
      if (ctx.trials[i][ctx.participantIndex] === ctx.participant) {
          if (!(ctx.trials[i][ctx.blockIndex] === block)) {
              block = ctx.trials[i][ctx.blockIndex];
              options.push(block);
          }
      }
  }

  var select = d3.select("#blockSel")
  select.selectAll("option")
      .data(options)
      .enter()
      .append("option")
      .text(function (d) { return d; });

  setBlock(options[0]);

};

function onchangeParticipant() {
  selectValue = d3.select("#participantSel").property("value");
  setParticipant(selectValue);
};

function onchangeBlock() {
  selectValue = d3.select("#blockSel").property("value");
  setBlock(selectValue);
};

function onchangeTrial() {
  selectValue = d3.select("#trialSel").property("value");
  setTrial(selectValue);
};