package swim.transit;

import com.microsoft.azure.eventhubs.EventHubException;

import swim.api.SwimLane;
import swim.api.agent.AbstractAgent;
import swim.api.lane.CommandLane;
import swim.api.lane.MapLane;
import swim.api.lane.ValueLane;
import swim.concurrent.TimerRef;
import ai.swim.azureDeviceUtil.SendEvent;
import ai.swim.eventHub.AutoScaleOnIngress;
import swim.recon.Recon;
import swim.structure.Record;
import swim.structure.Value;
import swim.uri.Uri;
import swim.json.Json;
import swim.util.Cursor;
import swim.structure.Item;
import swim.configUtil.ConfigEnv;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.ByteArrayInputStream;

import java.util.Iterator;

public class AggregationAgent extends AbstractAgent {

  private TimerRef eventHubTimer;
  private String targetDirectory = "../rawData/out";
  private Integer airportCount = 0;


  @SwimLane("agencies")
  MapLane<String, Record> agenciesMapLane = this.<String, Record>mapLane();

  @SwimLane("currentSimTime")
  ValueLane<Long> currentSimTime = this.<Long>valueLane();

  @SwimLane("currentSimTicks")
  ValueLane<Value> currentSimTicks = this.<Value>valueLane();

  /**
   * Command Lane called by State Agents when they are created. This will insert
   * the new State Vector into stateList and callsign Map Lanes
   */
  @SwimLane("addAgency")
  public CommandLane<Record> addCallsign = this.<Record>commandLane()
    .onCommand((Record newAgency) -> {
      // System.out.println(newAgency);
      String agencyTag = newAgency.get("tag").stringValue();
      this.agenciesMapLane.put(agencyTag, newAgency);
      command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/agency/" + agencyTag), Uri.parse("updateAgencyInfo"), newAgency);
    });

  @SwimLane("setSimTime")
    public CommandLane<Value> setSimTimeCommand = this.<Value>commandLane()
      .onCommand((Value v) -> {
        this.currentSimTime.set(v.longValue());
      });    
  
  @SwimLane("setSimTick")
    public CommandLane<Value> setSimTickCommand = this.<Value>commandLane()
      .onCommand((Value v) -> {
        // System.out.println(v);
        this.currentSimTicks.set(v);
      });    
        
  /**
   * Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    
    if(ConfigEnv.AGGREGATE_HUB_NAME != null) {
      // this.setEventHubTimer();
    }
    
    System.out.println("Aggregation Agent started");
  }

}