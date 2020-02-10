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

import java.net.URL;
import java.util.Iterator;


public class AgencyAgent extends AbstractAgent {

  private String routeUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeList&a=";

  @SwimLane("tag")
  protected ValueLane<Value> tag;

  @SwimLane("agencyInfo")
  protected ValueLane<Value> agencyInfo;

  @SwimLane("agencyDetails")
  protected ValueLane<Record> agencyDetails;

  @SwimLane("routeList")
  protected MapLane<String, String> routeList;

  @SwimLane("vehicleList")
  protected MapLane<String, Value> vehicleList;

  @SwimLane("updateAgencyInfo")
  public CommandLane<Value> updateAgencyInfoCommand = this.<Value>commandLane()
    .onCommand((Value newInfo) -> {
      // System.out.println(newInfo);
      this.tag.set(newInfo.get("tag"));
      this.agencyInfo.set(newInfo);
      this.getRouteList();
      this.getVehicleList();
    });

  @SwimLane("updateVehicleList")
  public CommandLane<Record> updateVehicleListCommand = this.<Record>commandLane()
    .onCommand((Record vehicleList) -> {
      System.out.print("New vehicles: ");
      // System.out.println(vehicleList);

      final Iterator<Item> vehicleIterator = vehicleList.iterator();
      
      while(vehicleIterator.hasNext()) {
        final Item xmlRowData = vehicleIterator.next();
        final Value vehicleData = xmlRowData.getAttr("vehicle");      
        if (vehicleData.isDefined()) {
          this.vehicleList.put(vehicleData.get("id").stringValue(), vehicleData);
        }
      }
      
      System.out.print("Agency [" + this.tag.get().stringValue() + "] has "); 
      System.out.print(this.vehicleList.size());
      System.out.println(" Vehicles");
      this.refreshAgencyDetails();

    });

  @SwimLane("updateRouteList")
  public CommandLane<Record> updateRouteListCommand = this.<Record>commandLane()
    .onCommand((Record newRoute) -> {
      System.out.print("New Route: ");
      // System.out.println(newRoute.toString());
      final Iterator<Item> routeIterator = newRoute.iterator();
      
      while(routeIterator.hasNext()) {
        final Item route = routeIterator.next();
        final Value header = route.getAttr("route");      
        if (header.isDefined()) {
          final String routeTag = header.get("tag").stringValue("");
          final String routeTitle = header.get("title").stringValue("");
          final String routeUID = this.tag.get().stringValue() + "-" + routeTag;
          final Record routeInfo = Record.create()
            .slot("agencyTag", this.tag.get().stringValue())
            .slot("uid", routeUID)
            .slot("tag", routeTag)
            .slot("title", routeTitle);

          this.routeList.put(routeUID, routeTitle);
          command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/routes/" + routeUID), Uri.parse("updateRouteInfo"), routeInfo);
          // final Route route = new Route().withTag(header.get("tag").stringValue()).withTitle(header.get("title").stringValue());
          // routes.add(route);
        }        
        
      }
      System.out.print("Agency [" + this.tag.get().stringValue() + "] has "); 
      System.out.print(this.routeList.size());
      System.out.println(" routes");
      this.refreshAgencyDetails();
    });
    
  /**
    Standard startup method called automatically when WebAgent is created
   */
  @Override
  public void didStart() {
    System.out.println("Agency Agent Started: ");
  }

  private void getRouteList() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    String tag = this.tag.get().stringValue();
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/agency/" + tag)
      .slot("targetLane", "updateRouteList")
      .slot("apiUrl", routeUrl + tag);

    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9002"), Uri.parse("/apiRequestAgent/routes"), Uri.parse("makeRequest"), apiRequestInfo);    
  }

  private void getVehicleList() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    final String tag = this.tag.get().stringValue();
    final String url = String.format("http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=%s&t=0", tag);
    final Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/agency/" + tag)
      .slot("targetLane", "updateVehicleList")
      .slot("apiUrl", url);

      // System.out.println(apiRequestInfo);
    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9002"), Uri.parse("/apiRequestAgent/vehicles"), Uri.parse("makeRequest"), apiRequestInfo);       
  }

  private void refreshAgencyDetails() {
    final Record newDetails = Record.create()
      .slot("routeCount", this.routeList.size())
      .slot("vehicleCount", this.vehicleList.size());

    this.agencyDetails.set(newDetails);
  }
}
