package swim.transit;

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

public class RouteAgent extends AbstractAgent {

  private String routeUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=";
  private String routeUid;
  private String routeTag;
  private String agencyTag;

  @SwimLane("routeInfo")
  protected ValueLane<Value> routeInfo;

  @SwimLane("routeDetails")
  protected ValueLane<Value> routeDetails;

  @SwimLane("stops")
  protected MapLane<String, Value> stops;

  @SwimLane("paths")
  protected MapLane<Integer, Value> paths;


  @SwimLane("updateRouteInfo")
  public CommandLane<Value> updateRouteInfoCommand = this.<Value>commandLane()
    .onCommand((Value newInfo) -> {
    //   System.out.println(newInfo);
        this.agencyTag = newInfo.get("agencyTag").stringValue();
        this.routeUid = newInfo.get("uid").stringValue("");
        this.routeTag = newInfo.get("tag").stringValue("");
        this.routeInfo.set(newInfo);
        this.getRouteDetails();
    });

  @SwimLane("updateRouteDetails")
  public CommandLane<Record> updateRouteDetailsCommand = this.<Record>commandLane()
    .onCommand((Record routeDetails) -> {
        // System.out.println("----------------- route data start -----------");

        final Iterator<Item> routeIterator = routeDetails.iterator();
      
        while(routeIterator.hasNext()) {
          final Item xmlRowData = routeIterator.next();
          final Value routeData = xmlRowData.getAttr("route");      
          if (routeData.isDefined()) {
            
            // try to find stops and paths
            final Iterator<Item> stopIterator = xmlRowData.iterator();
            while(stopIterator.hasNext()) {
                final Item stopItem = stopIterator.next();
                final Value stopData = stopItem.getAttr("stop");
                final Value pathData = stopItem.tail();
                if(stopData.isDefined()) {
                    this.stops.put(stopData.get("tag").stringValue(), stopData);
                }
                if(pathData.isDefined()) {
                    this.paths.put(this.paths.size(), pathData);
                }                
            }

            // set detail info
            final Record details = Record.create()
                .slot("agencyTag", this.agencyTag)
                .slot("tag", this.routeTag)
                .slot("uid", this.routeUid)
                .slot("shortTitle", routeData.get("shortTitle"))
                .slot("color", routeData.get("color"))
                .slot("oppositeColor", routeData.get("oppositeColor"))
                .slot("stopCount", this.stops.size())
                .slot("pathCount", this.paths.size());

            this.routeDetails.set(details);
            // System.out.println(details);
          }
        }
        // System.out.println("----------------- route data end -----------");

    });
    
  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    // System.out.println("Route Agent Started: ");
  }

  private void getRouteDetails() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/routes/" + this.routeUid)
      .slot("targetLane", "updateRouteDetails")
      .slot("apiUrl", this.routeUrl + this.agencyTag + "&r=" + this.routeTag);

    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9002"), Uri.parse("/apiRequestAgent/routeDetails"), Uri.parse("makeRequest"), apiRequestInfo);    
  }
}
