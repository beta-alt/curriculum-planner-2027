(() => {
const xml=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const colName=index=>{let name="";for(let n=index+1;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;return name};
const cellRef=(row,col)=>colName(col)+(row+1);
const argb=color=>"FF"+String(color||"#FFFFFF").replace("#","").toUpperCase();

window.exportCurriculumXlsx=async model=>{
  if(!window.JSZip)throw new Error("Excel 압축 모듈을 불러오지 못했습니다");
  const zip=new JSZip(),creditStart=6,gradingCol=creditStart+model.creditCount,noteCol=gradingCol+1,lastCol=noteCol;
  const rows=[],merges=[],mergeAreas=[],styles=[],styleMap=new Map(),fills=["FFFFFF","EEF1EB","E2E9E3","F7F8F5","E7AAA5","DBE9D7","EEF4EA"];
  const fillId=color=>{const value=argb(color);let i=fills.indexOf(value.slice(2));if(i<0){fills.push(value.slice(2));i=fills.length-1}return i+2};
  const styleId=(options={})=>{const key=JSON.stringify(options);if(styleMap.has(key))return styleMap.get(key);const id=styles.length;styles.push(options);styleMap.set(key,id);return id};
  const defaultStyle=styleId({});
  
  const gridBorder="thin",sectionBorder="medium",outerBorder="medium";
  const baseStyle={align:"center",border:gridBorder},headerStyle=styleId({...baseStyle,fill:1,bold:true}),trackStyle=styleId({...baseStyle,fill:2,bold:true}),semesterStyle=styleId({...baseStyle,fill:3,bold:true}),bodyStyle=styleId(baseStyle),textStyle=styleId({align:"center",border:gridBorder}),totalStyle=styleId({...baseStyle,fill:4,bold:true}),activitySectionStyle=styleId({...baseStyle,fill:5,bold:true}),activityStyle=styleId({...baseStyle,fill:6,bold:true});
  const outsideBlankStyle=defaultStyle;
  const boundaryStyle=(base,options={})=>styleId({...base,...options});
  const pushRow=(height=26)=>{const row={height,cells:[]};rows.push(row);return row};
  const set=(row,col,value,style=bodyStyle)=>{row.cells[col]={value,style}};
  const merge=(r1,c1,r2,c2)=>{if(r1!==r2||c1!==c2){merges.push(`${cellRef(r1,c1)}:${cellRef(r2,c2)}`);mergeAreas.push({r1,c1,r2,c2})}};

  // [수정 1] 표 바깥쪽(제목 1행) 부분의 음영(fill:1)과 선(border:"medium")을 제거하여 배경을 흰색, 선을 없앰
  let row=pushRow(30);set(row,0,`${model.schoolName} 2027 교육과정 편제표`,styleId({align:"center",bold:true,fontSize:16}));merge(0,0,0,lastCol);
  
  // [수정 2] 표 바깥쪽(제목 2행) 부분의 선(border:"thin")을 제거
  row=pushRow(22);set(row,0,`편제표 유형: ${model.templateName}  |  운영 과정: ${model.tracks.join(", ")}`,styleId({align:"center",bold:true}));merge(1,0,1,lastCol);
  
  const headerStart=2;
  const labels=["구분","교과(군)","과목","유형","기본학점","운영학점"];
  row=pushRow(25);labels.forEach((label,col)=>set(row,col,label,headerStyle));labels.forEach((_,col)=>merge(headerStart,col,headerStart+2,col));
  for(let grade=0;grade<3;grade++){const start=creditStart+grade*model.tracks.length*2,end=start+model.tracks.length*2-1,style=grade<2?styleId({...baseStyle,fill:1,bold:true,right:sectionBorder}):headerStyle;set(row,start,`${grade+1}학년`,style);merge(headerStart,start,headerStart,end)}
  set(row,gradingCol,"성적처리",headerStyle);merge(headerStart,gradingCol,headerStart+2,gradingCol);
  set(row,noteCol,"비고",headerStyle);merge(headerStart,noteCol,headerStart+2,noteCol);
  row=pushRow(25);
  for(let grade=0;grade<3;grade++)model.tracks.forEach((track,t)=>{const start=creditStart+grade*model.tracks.length*2+t*2,style=grade<2&&t===model.tracks.length-1?styleId({...baseStyle,fill:2,bold:true,right:sectionBorder}):trackStyle;set(row,start,track,style);merge(headerStart+1,start,headerStart+1,start+1)});
  row=pushRow(25);for(let col=0;col<model.creditCount;col++){const gradeEnd=(col+1)%(model.tracks.length*2)===0&&col<model.creditCount-1;set(row,creditStart+col,`${col%2+1}학기`,gradeEnd?styleId({...baseStyle,fill:3,bold:true,right:sectionBorder}):semesterStyle)}

  const dataStart=rows.length;
  model.rows.forEach((item,index)=>{
    const top=item.choiceStart?sectionBorder:undefined,bottom=item.choiceEnd?sectionBorder:undefined;
    const current=pushRow(29),common={align:"center",border:gridBorder,top,bottom};
    set(current,0,item.section,styleId(common));set(current,1,item.group,styleId(common));
    set(current,2,item.courseName,styleId(common));set(current,3,item.type,styleId(common));set(current,4,item.baseCredits,styleId(common));
    set(current,5,item.operationCredits,styleId(common));
    
    // [수정] 빈 학기 칸도 동일한 common 스타일(테두리, 그룹선 포함)을 적용하여 생성
    for(let col=0;col<model.creditCount;col++){
      const gradeEnd=(col+1)%(model.tracks.length*2)===0&&col<model.creditCount-1;
      set(current,creditStart+col,item.credits[col]??"",styleId({...common,right:gradeEnd?sectionBorder:common.right}));
    }
    
    set(current,gradingCol,item.grading,styleId(common));set(current,noteCol,item.note,styleId(common));
  });
  
  model.fieldMerges.forEach(item=>merge(dataStart+item.start,item.col,dataStart+item.end,item.col));
  model.creditMerges.forEach(item=>{
    const r=dataStart+item.start,c=creditStart+item.column,top=model.rows[item.start]?.choiceStart?sectionBorder:undefined,bottom=model.rows[item.end]?.choiceEnd?sectionBorder:undefined;
    rows[r].cells[c]={value:item.isPrimary===false?"":`[택${item.pick}]\n${item.totalCredits}`,style:styleId({align:"center",border:gridBorder,top,bottom,fillColor:item.color,bold:true,wrap:true})};
    merge(r,c,dataStart+item.end,c);
  });

  (model.creditHighlights||[]).forEach(item=>{
    const r=dataStart+item.row,c=creditStart+item.column,cell=rows[r]?.cells[c];
    if(!cell)return;
    rows[r].cells[c]={...cell,style:styleId({...styles[cell.style],fillColor:item.color})};
  });

  const activityStart=rows.length;
  model.activities.forEach((activity,index)=>{
    const current=pushRow(29);
    if(index===0){set(current,0,"창의적 체험활동",activitySectionStyle);merge(activityStart,0,activityStart+2,1)}
    set(current,2,activity.name,activityStyle);merge(activityStart+index,2,activityStart+index,5);
    
    // [수정] 창체 영역 빈 학기 칸 처리
    for(let col=0;col<model.creditCount;col++){
      const gradeEnd=(col+1)%(model.tracks.length*2)===0&&col<model.creditCount-1;
      set(current,creditStart+col,activity.credits[col]??"",gradeEnd?styleId({...baseStyle,fill:6,bold:true,right:sectionBorder}):activityStyle);
    }
    
    set(current,gradingCol,"",activityStyle);set(current,noteCol,"",activityStyle);
  });
  
  row=pushRow(28);set(row,0,"과정별·학기별 이수학점 합계",totalStyle);merge(rows.length-1,0,rows.length-1,5);
  // [수정] 합계 영역 빈 학기 칸 처리
  for(let col=0;col<model.creditCount;col++){
    const gradeEnd=(col+1)%(model.tracks.length*2)===0&&col<model.creditCount-1;
    set(row,creditStart+col,model.totals[col]??"",gradeEnd?styleId({...baseStyle,fill:4,bold:true,right:sectionBorder}):totalStyle);
  }
  set(row,gradingCol,`총 이수학점 ${model.grandTotal??0}`,totalStyle);
  set(row,noteCol,"",totalStyle);
  merge(rows.length-1,gradingCol,rows.length-1,noteCol);

  mergeAreas.forEach(({r1,c1,r2,c2})=>{
    const anchor=rows[r1].cells[c1]||{value:"",style:bodyStyle},anchorStyle=styles[anchor.style]||baseStyle;
    for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++){
      const current=rows[r].cells[c]||{value:"",style:anchor.style},sourceStyle=styles[current.style]||anchorStyle;
      const edgeStyle={...sourceStyle};delete edgeStyle.border;
      if(c===c1)edgeStyle.left=sourceStyle.left||anchorStyle.left||anchorStyle.border;
      else delete edgeStyle.left;
      if(c===c2)edgeStyle.right=sourceStyle.right||anchorStyle.right||anchorStyle.border;
      else delete edgeStyle.right;
      if(r===r1)edgeStyle.top=sourceStyle.top||anchorStyle.top||anchorStyle.border;
      else delete edgeStyle.top;
      if(r===r2)edgeStyle.bottom=sourceStyle.bottom||anchorStyle.bottom||anchorStyle.border;
      else delete edgeStyle.bottom;
      rows[r].cells[c]={value:r===r1&&c===c1?anchor.value:"",style:styleId(edgeStyle)};
    }
  });
  
  for(let c=0;c<=lastCol;c++){
    const cell=rows[activityStart].cells[c]||{value:"",style:bodyStyle},edgeStyle={...(styles[cell.style]||baseStyle),top:sectionBorder};
    rows[activityStart].cells[c]={...cell,style:styleId(edgeStyle)};
  }
  
  const tableBottom=rows.length-1;
  for(let r=headerStart;r<=tableBottom;r++)for(let c=0;c<=lastCol;c++){
    const cell=rows[r].cells[c]||{value:"",style:bodyStyle},edgeStyle={...(styles[cell.style]||baseStyle)};
    if(r===headerStart)edgeStyle.top=outerBorder;
    if(c===0)edgeStyle.left=outerBorder;
    if(r===tableBottom)edgeStyle.bottom=outerBorder;
    if(c===lastCol)edgeStyle.right=outerBorder;
    rows[r].cells[c]={...cell,style:styleId(edgeStyle)};
  }
  const sheetLastCol=lastCol+1;
  for(let r=0;r<=tableBottom;r++)rows[r].cells[sheetLastCol]={value:"",style:outsideBlankStyle};
  const outsideBottomRow=pushRow(15);
  for(let c=0;c<=sheetLastCol;c++)outsideBottomRow.cells[c]={value:"",style:outsideBlankStyle};
  
  // [수정] Sparse 배열 방지 및 불필요한 inlineStr 태그 최적화
  const sheetRows=rows.map((entry,r)=>{
    let cellsXml = "";
    for(let c=0; c<=sheetLastCol; c++){
      const cell = entry.cells[c];
      if(!cell) continue;
      const ref = cellRef(r, c), style = ` s="${cell.style}"`;
      if(cell.value === ""){
        cellsXml += `<c r="${ref}"${style}/>`; // 값이 없는 셀은 빈 껍데기 유지
      } else if(typeof cell.value === "number"){
        cellsXml += `<c r="${ref}"${style}><v>${cell.value}</v></c>`;
      } else {
        cellsXml += `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`;
      }
    }
    return `<row r="${r+1}" ht="${entry.height}" customHeight="1">${cellsXml}</row>`;
  }).join("");

  const cols=Array.from({length:sheetLastCol+1},(_,c)=>{
    const saved=Number(model.columnWidths?.[c]||70),px=c===gradingCol?Math.max(saved,190):c===noteCol?Math.max(saved,110):saved;
    return`<col min="${c+1}" max="${c+1}" width="${Math.max(5,px/7).toFixed(2)}" customWidth="1"/>`;
  }).join("");
  
  // [수정] 테두리 색상 처리 시 범용적인 기본 색상 속성(auto="1") 사용
  const borderXml=options=>{
    const borderFor=name=>Object.prototype.hasOwnProperty.call(options,name)?options[name]:options.border;
    const edge=(name,style)=>`<${name}${style?` style="${style}"`:""}>${style?'<color auto="1"/>':""}</${name}>`;
    return`<border>${edge("left",borderFor("left"))}${edge("right",borderFor("right"))}${edge("top",borderFor("top"))}${edge("bottom",borderFor("bottom"))}<diagonal/></border>`;
  };
  
  // [수정] 엑셀 표준 준수: 인덱스 0에는 빈 스타일을 강제 할당
  const borderKeys=['{}'];
  const borderIds=styles.map(s=>{const key=JSON.stringify({border:s.border,left:s.left,right:s.right,top:s.top,bottom:s.bottom});let i=borderKeys.indexOf(key);if(i<0){borderKeys.push(key);i=borderKeys.length-1}return i});
  const fonts=[{},...styles.filter(s=>s.bold||s.fontSize).map(s=>({bold:s.bold,size:s.fontSize}))];
  const fontKey=s=>s.bold||s.fontSize?1+styles.filter((x,i)=>i<styles.indexOf(s)&&(x.bold||x.fontSize)).findIndex(x=>x.bold===s.bold&&x.fontSize===s.fontSize):-1;
  const uniqueFonts=['{}'];
  const fontIds=styles.map(s=>{const key=JSON.stringify({bold:!!s.bold,size:s.fontSize||11});let i=uniqueFonts.indexOf(key);if(i<0){uniqueFonts.push(key);i=uniqueFonts.length-1}return i});
  styles.forEach(s=>{if(s.fillColor)fillId(s.fillColor)});
  
  const styleSheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${uniqueFonts.length}">${uniqueFonts.map(key=>{const f=JSON.parse(key);return`<font>${f.bold?"<b/>":""}<sz val="${f.size||11}"/><name val="Arial"/><family val="2"/></font>`}).join("")}</fonts><fills count="${fills.length+2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fills.map(color=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill>`).join("")}</fills><borders count="${borderKeys.length}">${borderKeys.map(key=>borderXml(JSON.parse(key))).join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${styles.length}">${styles.map((s,i)=>`<xf numFmtId="0" fontId="${fontIds[i]}" fillId="${s.fillColor?fillId(s.fillColor):s.fill!==undefined?s.fill+2:0}" borderId="${borderIds[i]}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${s.align||"center"}" vertical="center"${s.wrap?' wrapText="1"':""}/></xf>`).join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const usedRange=`A1:${cellRef(rows.length-1,sheetLastCol)}`;
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1" autoPageBreaks="0"/></sheetPr><dimension ref="${usedRange}"/><sheetViews><sheetView workbookViewId="0" view="normal" showGridLines="0" showRowColHeaders="1" showPageBreaks="0" zoomScale="85"><pane xSplit="6" ySplit="5" topLeftCell="G6" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${sheetRows}</sheetData><mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join("")}</mergeCells><printOptions horizontalCentered="1" verticalCentered="0"/><pageMargins left="0.2" right="0.2" top="0.35" bottom="0.35" header="0.15" footer="0.15"/><pageSetup paperSize="8" orientation="landscape" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;C&amp;P / &amp;N</oddFooter></headerFooter></worksheet>`;
  
  zip.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder("_rels").file(".rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder("docProps").file("core.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(model.schoolName)} 2027 교육과정 편제표</dc:title><dc:creator>교육과정 편제실</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`).file("app.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>교육과정 편제실</Application></Properties>`);
  zip.folder("xl").file("workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="2027 편제표" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">'2027 편제표'!$1:$5</definedName></definedNames><calcPr calcId="191029"/></workbook>`).file("styles.xml",styleSheet).folder("worksheets").file("sheet1.xml",worksheet);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("xl/curriculum-state.json",JSON.stringify({version:1,fieldMerges:model.fieldMerges||[],creditMerges:model.creditMerges||[],creditHighlights:model.creditHighlights||[]}));
  
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",compression:"DEFLATE"});
};
})();
