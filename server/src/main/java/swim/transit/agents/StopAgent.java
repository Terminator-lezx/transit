package swim.transit.agents;

import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.ValueLane;
import swim.api.lane.MapLane;
import swim.concurrent.TimerRef;
import swim.json.Json;
import swim.structure.Item;
import swim.structure.Record;
import swim.structure.Value;
import swim.uri.Uri;
import swim.util.Cursor;

import java.util.Iterator;
import java.util.ArrayList;
import java.util.List;


public class StopAgent extends AbstractAgent {

    private String stopId;
    private String stopKey;
    private String agencyTag;
    private String scheduleUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=";
    private TimerRef predictionRefreshTimer;

    @SwimLane("stopData")
    public ValueLane<Value> stopData;

    @SwimLane("predictionInfo")
    public ValueLane<Value> predictionInfo;

    @SwimLane("predictions")
    public ValueLane<Record> predictions;

    @SwimLane("updateStop")
    public CommandLane<Record> updateAgencyInfoCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {

            this.agencyTag = newInfo.get("agencyTag").stringValue("");
            this.stopData.set(newInfo.get("stopData"));
            this.stopId = newInfo.get("stopData").get("stopId").stringValue("");
            this.stopKey = newInfo.get("stopKey").stringValue("");
            // this.getStopPredictions();

    });    

    @SwimLane("updateStopPredictions")
    public CommandLane<Record> updateStopPredictionsCommand = this.<Record>commandLane()
        .onCommand((Record newData) -> {
          // System.out.println(newData);
          this.predictions.set(newData);
          // final Iterator<Item> dataIterator = newData.iterator();
          // Record finalPredictionData = Record.create();

          // while(dataIterator.hasNext()) {
          //   final Item dataRow = dataIterator.next();
          //   final Value header = dataRow.getAttr("predictions");      
          //   final Value prediction = dataRow.tail();
            
          //   if (header.isDefined()) {
          //     this.predictionInfo.set(header);
          //   }
          //   if(prediction.isDefined()) {
          //     // System.out.println(prediction);

          //     final Iterator<Item> predictionIterator = prediction.iterator();
          //     while(predictionIterator.hasNext()) {
          //       final Item directionRow = predictionIterator.next();
          //       final Value direction = directionRow.getAttr("direction");
                
          //       if(direction.isDefined()) {
          //         final Value directionData = directionRow.tail();
          //         final Iterator<Item> directionDataIterator = directionData.iterator();
          //         Record predictionList = Record.create();
          //         while(directionDataIterator.hasNext()) {
          //           Item predictionData = directionDataIterator.next();
          //           final Value predictionContent = predictionData.getAttr("prediction");
          //           if(predictionContent.isDefined()) {
          //             predictionList.add(predictionContent);
                      
          //           }
          //         }
          //         finalPredictionData.slot(direction.get("title").stringValue(), predictionList);
          //       }
          //     }
          //   }
          // }
          // this.predictions.set(finalPredictionData);
          
        });
  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    // System.out.println("Stop  Agent Started: ");
  }

  private void getStopPredictions() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/stop/" + this.stopKey)
      .slot("targetLane", "updateStopPredictions")
      .slot("apiUrl", scheduleUrl + this.agencyTag + "&stopId=" + this.stopId);
// System.out.println(apiRequestInfo);
    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/apiRequestAgent/routePrediction"), Uri.parse("makeRequest"), apiRequestInfo);    

    // this.startPredictionRefreshTimer();
  }  

  private void startPredictionRefreshTimer() {
    if(this.predictionRefreshTimer != null && this.predictionRefreshTimer.isScheduled()) {
      this.predictionRefreshTimer.cancel();
    }

    this.predictionRefreshTimer = setTimer((30000), this::getStopPredictions);
  }  
}