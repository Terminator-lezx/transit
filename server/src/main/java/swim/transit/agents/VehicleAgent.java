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

public class VehicleAgent extends AbstractAgent {

    @SwimLane("vehicleData")
    public ValueLane<Record> vehicleData;

    @SwimLane("updateVehicle")
    public CommandLane<Record> updateAgencyInfoCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {
        // System.out.println(newInfo);
        this.vehicleData.set(newInfo);
        
    });    
  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    System.out.println("Vehicle Agent Started: ");
  }


}