"use client";
import React, {Fragment, useEffect, useRef} from 'react';
import cytoscape from 'cytoscape';

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

function AccountsGraph() {

}

export default function Page() {
  const graphRef = useRef(null)
  
  const drawGraph = () => {
    const cy = cytoscape({
     container: graphRef.current,
     elements: [
       { data: { id: 'a' } },
       { data: { id: 'b' } },
       {
         data: {
           id: 'ab',
           source: 'a',
           target: 'b'
         }
       }]
     })
    }
   
    useEffect(() => {
     drawGraph()
    }, [])
  
  

  // const cy = cytoscape({
  //   container: document.getElementById('cy'),
  //   elements: [
  //     { data: { id: 'a' } },
  //     { data: { id: 'b' } },
  //     {
  //       data: {
  //         id: 'ab',
  //         source: 'a',
  //         target: 'b'
  //       }
  //     }
  //   ],
  //   style: [
  //     {
  //       selector: 'node',
  //       style: {
  //         'background-color': '#666',
  //         'label': 'data(id)'
  //       }
  //     },
  //     {
  //       selector: 'edge',
  //       style: {
  //         'width': 3,
  //         'line-color': '#ccc',
  //         'target-arrow-color': '#ccc',
  //         'target-arrow-shape': 'triangle'
  //       }
  //     }
  //   ]
  // });



  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-1 flex-col gap-4 p-4">
              {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                
              </div> */}
              <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min">
              <div ref={graphRef} style={{ width: '100%', height: '100%' }}></div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
