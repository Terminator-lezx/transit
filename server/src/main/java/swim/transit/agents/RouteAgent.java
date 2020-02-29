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

public class RouteAgent extends AbstractAgent {

  private String routeUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=";
  private String scheduleUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=schedule&a=";
  private String predictionsUrl = "http://webservices.nextbus.com/service/publicXMLFeed?command=predictionsForMultiStops";

  private String routeUid;
  private String routeTag;
  private String agencyTag;
  private String stopIdQueryString = "";
  private TimerRef predictionRefreshTimer;

  @SwimLane("routeInfo")
  protected ValueLane<Value> routeInfo;

  @SwimLane("routeDetails")
  protected ValueLane<Value> routeDetails;

  @SwimLane("schedule")
  protected ValueLane<Value> schedule;

  @SwimLane("stops")
  protected MapLane<String, Value> stops;

  @SwimLane("paths")
  protected MapLane<Integer, Value> paths;

  @SwimLane("updateRouteSchedule")
  public CommandLane<Value> updateRouteScheduleCommand = this.<Value>commandLane()
    .onCommand((Value newData) -> {
        final Iterator<Item> xmlIterator = newData.iterator();
        
        while(xmlIterator.hasNext()) {
          final Item xmlRowData = xmlIterator.next();
          final Value bodyData = xmlRowData.getAttr("body");      
          System.out.println(xmlRowData.tail());
          if (bodyData.isDefined()) {
            System.out.println(bodyData);
          }
        }
      
      // this.schedule.set(newData);
    });

  @SwimLane("updateRouteInfo")
  public CommandLane<Value> updateRouteInfoCommand = this.<Value>commandLane()
    .onCommand((Value newInfo) -> {
    //   System.out.println(newInfo);
        this.agencyTag = newInfo.get("agencyTag").stringValue("");
        this.routeUid = newInfo.get("uid").stringValue("");
        this.routeTag = newInfo.get("tag").stringValue("");
        this.routeInfo.set(newInfo);
        this.stopIdQueryString = String.format("%s&a=%s", predictionsUrl, agencyTag);
        // if(!this.agencyTag.equals("")) {
          this.getRouteDetails();
          // this.getRouteSchedule();
        // }
    });

  @SwimLane("updateRouteDetails")
  public CommandLane<Record> updateRouteDetailsCommand = this.<Record>commandLane()
    .onCommand((Record routeDetails) -> {
        // System.out.println("----------------- route data start -----------");

        final Iterator<Item> xmlIterator = routeDetails.iterator();

        while(xmlIterator.hasNext()) {
          final Item xmlRowData = xmlIterator.next();
          final Value routeData = xmlRowData.getAttr("route");      

          if (routeData.isDefined()) {
            // System.out.println("----------------- route data defined ---------------------");
            // System.out.println(routeData);
            // try to find stops and paths
            final Iterator<Item> stopIterator = xmlRowData.iterator();
            
            while(stopIterator.hasNext()) {
              final Item stopItem = stopIterator.next();
              String rowTag = stopItem.tag();
              if(rowTag != null) {
                switch(rowTag) {
                  case "stop":
                    final Value stopData = stopItem.getAttr("stop");

                    // System.out.println(stopData);
                    String stopKey = this.routeTag + stopData.get("stopId").stringValue("");
                    Record stopRecord = Record.create()
                      .slot("agencyTag", this.agencyTag)
                      .slot("stopKey", stopKey)
                      .slot("stopData", stopData);

                    // add this stop to the predictions query url 
                    this.stopIdQueryString += String.format("&stops=%s|%s", this.routeTag, stopData.get("tag").stringValue("id"));

                    this.stops.put(stopKey, stopData);
                    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/stop/" + stopKey), Uri.parse("updateStop"), stopRecord);    
                    break;

                  case "direction":
                    // System.out.println("direction");
                    break;

                  case "path":
                    final Value pathData = stopItem.tail();
                    final Iterator<Item> pathIterator = pathData.iterator();
                    final Record points = Record.create();
                    while(pathIterator.hasNext()) {
                      final Item path = pathIterator.next();
                      if(path.tag() != null) {
                        points.add(path);
                      }
                    }
                    
                    this.paths.put(this.paths.size(), points);
                    break;

                }
                // final Value stopData = stopItem.getAttr("stop");
                // final Value pathData = stopItem.hasAttr("path");
                // System.out.println(this.routeUid + ":" + stopItem.tag());
                // if(stopData.isDefined()) {
                //   // System.out.println(stopData);
                //   this.stops.put(stopData.get("tag").stringValue(), stopData);
                // } 
                // if(pathData.isDefined()) {
                //   System.out.println(pathData);
                //     // this.paths.put(this.paths.size(), pathData);
                // }                
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
                .slot("pathCount", this.paths.size())
                .slot("minLat", routeData.get("latMin"))
                .slot("minLong", routeData.get("lonMin"))
                .slot("maxLat", routeData.get("latMax"))
                .slot("maxLong", routeData.get("lonMax"));

            this.routeDetails.set(details);

            Record agencyBounds = Record.create()
              .slot("minLat", routeData.get("latMin").doubleValue(0d))
              .slot("maxLat", routeData.get("latMax").doubleValue(0d))
              .slot("minLong", routeData.get("lonMin").doubleValue(0d))
              .slot("maxLong", routeData.get("lonMax").doubleValue(0d));

            command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/agency/" + this.agencyTag), Uri.parse("updateAgencyBounds"), agencyBounds);     
          } 
        }
        // System.out.println(agencyBounds);
        this.getStopPredictions();
        // System.out.println("----------------- route data end -----------");

    });
    
  @SwimLane("updateRoutePredictions")
  public CommandLane<Record> updateRoutePredictionsCommand = this.<Record>commandLane()
    .onCommand((Record xmlDataset) -> {
        // System.out.println("----------------- route data start -----------");
        // System.out.println(routePredictions);
        final Iterator<Item> xmlIterator = xmlDataset.iterator();

        
        
        Record predictionData = Record.create();
        // Record tagData = Record.create();
        String stopTag = "";

        //for each row of returned xml data
        while(xmlIterator.hasNext()) {
          // System.out.println("------------------------------------");
          Item xmlRowData = xmlIterator.next();
          if(xmlRowData != Value.absent()) {
            // for each <predictions> set, loop over contents
            Value predictionsAttr = xmlRowData.getAttr("predictions");
            if(predictionsAttr != Value.absent()) {
              Record predictionsData = xmlRowData.tail();
              Record parsedData = Record.create();
              Record directionData = Record.create();

              String stopKey = this.routeTag + predictionsAttr.get("stopTag").stringValue("-1");
              // command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/stop/" + stopKey), Uri.parse("updateStopPredictions"), Record.of(xmlRowData));

              final Iterator<Item> directionsIterator = predictionsData.iterator();
              // for each <direction> tag in <predictions>
              while(directionsIterator.hasNext()) {
                Item directionRow = directionsIterator.next();
                
                Record parsedPredictions = Record.create();
                if(directionRow != Value.absent()) {
                  if(directionRow.getItem(0) != Value.absent()) {
                    // System.out.println(directionRow);
                    
                    // for each row inside <directions> tag find predictions
                    final Iterator<Item> predictionRows = directionRow.iterator();
                    while(predictionRows.hasNext()) {
                      Item currentRow = predictionRows.next();
                      Value directionAttr = currentRow.getAttr("prediction");
                      if(directionAttr != Value.absent()) {
                        Item predictionRowData = currentRow;
                        parsedPredictions.add(currentRow.getAttr("prediction").tail());
                        // System.out.println(currentRow.getAttr("prediction").tail());
                        

                      }
                    }
                    directionData.put(directionRow.getAttr("direction").get("title").stringValue("none"), parsedPredictions);
                    // directionData.put("predictions", parsedPredictions);
                  }
                  
                  // directionData.put("title", directionRow.getAttr("direction").get("title").stringValue("none"));
                  
                  
                }
              }
              parsedData.put("directions", directionData);

              // String stopKey = this.routeTag + parsedData.get("stopData").get("stopTag").stringValue("-1");
              // System.out.println(stopKey);
              command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/stop/" + stopKey), Uri.parse("updateStopPredictions"), parsedData);
            }
          }
          // System.out.println("------------------------------------");
        }     

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
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/apiRequestAgent/routeDetails"), Uri.parse("makeRequest"), apiRequestInfo);    
  }

  private void getRouteSchedule() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/routes/" + this.routeUid)
      .slot("targetLane", "updateRouteSchedule")
      .slot("apiUrl", this.scheduleUrl + this.agencyTag + "&r=" + this.routeTag);

    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse("/apiRequestAgent/routeSchedule"), Uri.parse("makeRequest"), apiRequestInfo);    
  }  

  private void getStopPredictions() {
    // create record which will tell apiRequestAgent where to get data and where to put the result
    Record apiRequestInfo = Record.create()
      .slot("targetHost", "warp://127.0.0.1:9001")
      .slot("targetAgent", "/routes/" + this.routeUid)
      .slot("targetLane", "updateRoutePredictions")
      .slot("apiUrl", this.stopIdQueryString);

    // System.out.println(this.stopIdQueryString);
    // send command to apiRequestAgent to fetch data
    command(Uri.parse("warp://127.0.0.1:9001"), Uri.parse(String.format("/apiRequestAgent/%sRouteSchedule", this.routeUid)), Uri.parse("makeRequest"), apiRequestInfo);   
    this.startPredictionRefreshTimer(); 
  }

  private void startPredictionRefreshTimer() {
    if(this.predictionRefreshTimer != null && this.predictionRefreshTimer.isScheduled()) {
      this.predictionRefreshTimer.cancel();
    }

    this.predictionRefreshTimer = setTimer((10000), this::getStopPredictions);
  } 

}
