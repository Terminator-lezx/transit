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

    private String routeTag;
    private String stopId;
    private String stopKey;
    private String agencyTag;
    private String scheduleUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=";

    @SwimLane("stopData")
    public ValueLane<Value> stopData;

    @SwimLane("predictionInfo")
    public ValueLane<Value> predictionInfo;

    @SwimLane("predictions")
    public ValueLane<Record> predictions;

    @SwimLane("directions")
    public ValueLane<Record> directions;

    @SwimLane("updateStop")
    public CommandLane<Record> updateAgencyInfoCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {

            // System.out.println(newInfo);

            this.agencyTag = newInfo.get("agencyTag").stringValue("");
            this.stopData.set(newInfo.get("stopData"));
            this.stopId = newInfo.get("stopData").get("stopId").stringValue("");
            this.stopKey = newInfo.get("stopKey").stringValue("");
            this.routeTag = newInfo.get("routeTag").stringValue("");

            // System.out.println(this.stopId);
    });    

    @SwimLane("updateStopPredictions")
    public CommandLane<Record> updateStopPredictionsCommand = this.<Record>commandLane()
        .onCommand((Record newData) -> {
          this.predictions.set(newData);
          
          Record nextBuses = Record.create();
          newData.get("directions").forEach(directionData -> { 
            Value dirData = newData.get("directions").get(directionData.key());
            // System.out.print("dir data=");
            // System.out.println(dirData);
            if(dirData != Value.absent() && dirData.getItem(0) != Value.absent()) {
              Record nextBus = (Record)dirData.getItem(0);
              Value stopInfo = this.stopData.get();
              // System.out.println("--------");    
              // System.out.print("nextbus=");
              // System.out.println(nextBus);    
              // System.out.print("stopinfo=");
              // System.out.println(stopInfo);    
              // System.out.println("--------");    

              if(nextBus != Record.empty() && nextBus.get("seconds").intValue() == 0) {
                String vehicleId = nextBus.get("vehicle").stringValue().replaceAll("\\s+","");
                vehicleId += "-" + this.routeTag.replaceAll("\\s+","");

                command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/vehicle/" + vehicleId), Uri.parse("checkStopArrival"), stopInfo);
              }

              // nextBuses.putSlot(stopInfo.get("tripTag").stringValue(), Value.fromObject(nextBus));
              // System.out.println(predItem);
              // Value seconds = predItem.get("seconds");
              // if(seconds != Value.absent()) {
              //   System.out.println(predItem); 
              // }
              
            }
          });
          // System.out.println(nextBuses);
        });

  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    // System.out.println("Stop  Agent Started: ");
  }
 
}