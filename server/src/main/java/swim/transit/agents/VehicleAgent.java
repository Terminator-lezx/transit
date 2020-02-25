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

    private String vehicleId;

    @SwimLane("vehicleData")
    public ValueLane<Record> vehicleData;

    @SwimLane("speed")
    public ValueLane<Integer> speed;

    @SwimLane("location")
    public ValueLane<Record> location;

    @SwimLane("tracks")
    protected MapLane<Long, Record> tracks;

    @SwimLane("speedHistory")
    protected MapLane<Long, Integer> speedHistory;

    @SwimLane("updateVehicle")
    public CommandLane<Record> updateAgencyInfoCommand = this.<Record>commandLane()
        .onCommand((Record newInfo) -> {
        // System.out.println(newInfo);
        this.vehicleData.set(newInfo);

        this.vehicleId = newInfo.get("id").stringValue("") + "-" + newInfo.get("routeTag").stringValue("");
        Long currentTime = System.currentTimeMillis();
        Integer currentSpeed = newInfo.get("speedKmHr").intValue(0);
        Record currentLocation = Record.create(2)
            .slot("lat", newInfo.get("latitude").floatValue(0f))
            .slot("lng", newInfo.get("longitude").floatValue(0f));

        this.location.set(currentLocation);
        this.tracks.put(currentTime, currentLocation);       
        this.speed.set(currentSpeed);
        this.speedHistory.put(currentTime, currentSpeed);
    });    

  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    // System.out.println("Vehicle Agent Started: ");
  }


}