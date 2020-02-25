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

public class StopAgent extends AbstractAgent {

    private String stopId;
    private String agencyTag;
    private String scheduleUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=";

    @SwimLane("stopData")
    public ValueLane<Value> stopData;

    @SwimLane("prediction")
    public ValueLane<Record> prediction;

    @SwimLane("updateStop")
    public CommandLane<Record> updateAgencyInfoCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {

            this.agencyTag = newInfo.get("agencyTag").stringValue("");
            this.stopData.set(newInfo.get("stopData"));
            this.stopId = newInfo.get("stopData").get("stopId").stringValue("");
            this.getStopPredictions();
        // System.out.println(newInfo);
        // this.vehicleData.set(newInfo);

        // this.vehicleId = newInfo.get("id").stringValue("") + "-" + newInfo.get("routeTag").stringValue("");
        // Long currentTime = System.currentTimeMillis();
        // Integer currentSpeed = newInfo.get("speedKmHr").intValue(0);
        // Record currentLocation = Record.create(2)
        //     .slot("lat", newInfo.get("latitude").floatValue(0f))
        //     .slot("lng", newInfo.get("longitude").floatValue(0f));

        // this.location.set(currentLocation);
        // this.tracks.put(currentTime, currentLocation);       
        // this.speed.set(currentSpeed);
        // this.speedHistory.put(currentTime, currentSpeed);
    });    

    @SwimLane("updateStopPredictions")
    public CommandLane<Record> updateStopPredictionsCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {
            this.prediction.set(newInfo);
            // System.out.println(newInfo);
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
      .slot("targetAgent", "/stop/" + this.stopId)
      .slot("targetLane", "updateStopPredictions")
      .slot("apiUrl", scheduleUrl + this.agencyTag + "&stopId=" + this.stopId);
// System.out.println(apiRequestInfo);
    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/apiRequestAgent/routePrediction"), Uri.parse("makeRequest"), apiRequestInfo);    
  }  


}