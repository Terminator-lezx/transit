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

    @SwimLane("closestStop")
    public ValueLane<Record> closestStop;

    @SwimLane("speed")
    public ValueLane<Integer> speed;

    @SwimLane("isLate")
    public ValueLane<Boolean> isLate;

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
              .slot("lat", newInfo.get("lat").doubleValue(0d))
              .slot("lng", newInfo.get("lon").doubleValue(0d));

          this.location.set(currentLocation);
          this.tracks.put(currentTime, currentLocation);       
          this.speed.set(currentSpeed);
          this.speedHistory.put(currentTime, currentSpeed);
        });    


    @SwimLane("checkStopArrival")
    public CommandLane<Record> checkStopArrivalCommand = this.<Record>commandLane()
        .onCommand((Record stopInfo) -> {
          if(stopInfo == Value.absent() || this.location.get() == Value.absent()) {
            return;
          }
          
          try {
            // System.out.println("check stop arrival");
            Double latDiff = Math.abs(stopInfo.get("lat").doubleValue(0d) - this.location.get().get("lat").doubleValue(0d));
            Double lonDiff = Math.abs(stopInfo.get("lon").doubleValue(0d) - this.location.get().get("lng").doubleValue(0d));
            Double closestLatDiff = latDiff;
            Double closestLonDiff = lonDiff;

            // System.out.println(this.closestStop.get());
            if(this.closestStop.get() == Value.absent()) {
              this.closestStop.set(stopInfo);
            } else {
              Record closestStopInfo = this.closestStop.get();
              closestLatDiff = Math.abs(closestStopInfo.get("lat").doubleValue(0d) - this.location.get().get("lat").doubleValue(0d));
              closestLonDiff = Math.abs(closestStopInfo.get("lon").doubleValue(0d) - this.location.get().get("lng").doubleValue(0d));
              // System.out.println(String.format("%s < %s && %s < %s", closestLatDiff, latDiff, closestLonDiff, lonDiff));
              // System.out.println(String.format("%s && %s", closestLatDiff <= latDiff, closestLonDiff <= lonDiff));
              if(closestLatDiff <= latDiff || closestLonDiff <= lonDiff) {
                this.closestStop.set(stopInfo);
              }

            }

            if(this.closestStop.get().get("arrivalInSeconds").intValue(1000) <= 90) {
              // System.out.print(closestLatDiff);
              // System.out.print("=");
              // System.out.println(closestLonDiff);
              this.isLate.set(closestLatDiff > 0.001d || closestLonDiff > 0.001d);
            } else {
              if(this.isLate.get()) {
                this.isLate.set(false);
              }              
            }
            
            Record newData = Record.create().concat(this.vehicleData.get());
            newData.slot("isLate", this.isLate.get());
            this.vehicleData.set(newData);
            // System.out.println(this.isLate.get());

          } catch (Exception ex) {
            System.out.println("VehicleAgent:checkStopArrival");
            System.out.println(this.location.get());
          }

          
        });
  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    // System.out.println("Vehicle Agent Started: ");
  }


}