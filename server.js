const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = 3001;
app.use(bodyParser.json());
app.use(express.static('public'));

const DataPath = "content.json";
var Data;

fs.readFile(DataPath, (err, data) => {
  if (err) {
    console.log(err);
  } else {
    try {
      Data = JSON.parse(data);
    } catch (error) {
      console.error(error);
    }
  }
});

app.get('/initial-data', (req, res) => {
  res.json(Data);
});



app.post('/update-shape', (req, res) => {
  const newData = req.body;
  updateJsonFile(newData);
  res.json({ success: true });
});

app.post('/update-position', (req, res) => {
  const Objectposition = req.body.position;
  const Objectuuid = req.body.uuid;
  if (Data && Data.Objects) {
    Data.Objects.forEach(obj => {
      if (obj.Line.uuid === Objectuuid) {
        obj.Line.position = Objectposition;
      }
    });
  }
  const jsonString = JSON.stringify(Data);
  fs.writeFile(DataPath, jsonString, (err) => {
    res.json({ success: true })
  });
});

app.post('/include-sphere', (req, res) => {
  const lineid = req.body.IDs;
  const id = req.body.sphere.uuid;
  const position = req.body.sphere.position;
  const newmesh = req.body.points;
  let connectedObjectPositions = [];

  Data.objectIds.forEach(objIdS => {
    if (objIdS.id === lineid) {
      // console.log(objIdS.id);
      objIdS.Lines.forEach(objectUuid => {
        Data.Objects.forEach(obj => {
          if (obj.Line.uuid === objectUuid) {
            connectedObjectPositions.push(obj.Line.position);
          }
        });
      });
    }
    connectedObjectPositions.push(position);
  });
  // console.log(connectedObjectPositions);

  const nearestPoints = connectedObjectPositions.map(referencePoint => {
    const { x: x1, y: y1, z: z1 } = referencePoint;
    const distances = newmesh.map(point => {
      const { x: x2, y: y2, z: z2 } =
        point;
      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
      return distance;
    });

    const minDistance = Math.min(...distances);
    const nearestPointIndex = distances.findIndex(distance => distance === minDistance);
    return newmesh[nearestPointIndex];
  });

  // console.log(nearestPoints);
  let lastElement = nearestPoints[nearestPoints.length - 1];
  // console.log(lastElement);
  const sortedNearestPoints = nearestPoints.sort((a, b) => {
    const indexA = newmesh.indexOf(a);
    const indexB = newmesh.indexOf(b);
    return indexA - indexB;
  });
  // console.log(sortedNearestPoints);

  const IndexPosition = sortedNearestPoints.indexOf(lastElement);
  // console.log(IndexPosition);

  Data.objectIds.forEach(objIdS => {
    if (objIdS.id === lineid) {
      objIdS.Lines.splice(IndexPosition, 0, id);
    }
    // console.log(objIdS.Lines);
  });

  // console.log(Data.Objects);
  const jsonString = JSON.stringify(Data);
  // console.log(jsonString);
  fs.writeFile(DataPath, jsonString, (err) => {
    res.json({ success: true });
  });

});

app.post('/connect-objects', (req, res) => {
  const objectIds = req.body.IDs;
  const lineid = req.body.lineId;
  let lines = [];
  objectIds.forEach(id => {
    lines.push(id);
  });
  Data.objectIds.push({ Lines: lines, id: lineid });
  const jsonString = JSON.stringify(Data);
  fs.writeFile(DataPath, jsonString, (err) => {
    res.json({ success: true });
  });
});

// app.post('/realtime-rendering', (req, res) => {
//   const intersectuuid = req.body.UUID;
//   console.log(intersectuuid);

//   Data.objectIds.forEach(objIdS => {
//     if (objIdS.Lines.includes(intersectuuid)) {
//       console.log(objIdS.Lines);
//     }
//   });
//   res.json({ success: true })

// });

// app.post('/realtime-rendering', (req, res) => {
//   const intersectuuid = req.body.UUID;

//   let positions = [];

//   Data.objectIds.forEach(obj => {
//     obj.Lines.forEach(uuid => {
//       if (uuid === intersectuuid) {
//         obj.Lines.forEach(lineUUID => {
//           const matchedLine = Data.Objects.find(line => line.Line.uuid === lineUUID);
//           if (matchedLine) {
//             positions.push(matchedLine.Line.position); 

//           }
//         });
//       }
//     });
//   });
//   console.log(positions);
//   res.json({ success: true }); 
// });

app.post('/realtime-rendering', (req, res) => {
  const intersectuuid = req.body.UUID;

  let positionsArrays = [];

  Data.objectIds.forEach(obj => {
    obj.Lines.forEach(uuid => {
      if (uuid === intersectuuid) {
        let positions = [];
        obj.Lines.forEach(lineUUID => {
          const matchedLine = Data.Objects.find(line => line.Line.uuid === lineUUID);
          if (matchedLine) {
            positions.push(matchedLine.Line.position);
          }
        });
        // console.log(positions);
        positionsArrays.push(positions);
      }
    });
  });
  // console.log(positionsArrays);

  res.json({positions: positionsArrays });
});


// app.post('/realtime-rendering', (req, res) => {
//   const intersectuuid = req.body.UUID;
//   let positions = [];

//   Data.objectIds.forEach(obj => {
//     obj.Lines.forEach(uuid => {
//       // if (uuid === intersectuuid) {
//       //   obj.Lines.forEach(lineUUID => {
//       //     const matchedLine = Data.Objects.find(line => line.Line.uuid === lineUUID);
//       //     if (matchedLine) {
//       //       positions.push(matchedLine.Line.position);
//       //     }
//       //   });
//       // }
//     });
//   });

//   res.json({success: true});
//   // res.json({positions: positions });
// });


app.post('/delete-object', (req, res) => {
  const ObjectUuid = req.body.uuid;
  Data.Objects = Data.Objects.filter(obj => obj.Line.uuid !== ObjectUuid);

  if (Data && Data.Objects) {
    for (let i = Data.objectIds.length - 1; i >= 0; i--) {
      const elements = Data.objectIds[i];
      elements.Lines = elements.Lines.filter(id => id !== ObjectUuid);

      if (elements.Lines.length < 2) {
        Data.objectIds.splice(i, 1);
      }
    }
    const jsonString = JSON.stringify(Data);
    fs.writeFile(DataPath, jsonString, (err) => {
      if (err) {
        console.error(err);
      }
    })

    res.json({ success: true });
  }
});



function updateJsonFile(Line) {
  fs.readFile(DataPath, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      Data = JSON.parse(data);
      Data.Objects.push({ Line });
    }
    const jsonString = JSON.stringify(Data);
    fs.writeFile(DataPath, jsonString, (err) => {
      if (err) {
        console.error(err);
      }
    });
  });
}


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
