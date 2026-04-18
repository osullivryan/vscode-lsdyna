$-----------------------------------------------------------------------------
$
$ Example provided by Dr. Nils Karajan (DYNAmore Corporation)
$
$ Date: Wed Apr 11 10:42:53 CET 2018
$
$ E-Mail: info@dynamore.de
$ Web: http://www.dynamore.de
$
$ Copyright, 2018 DYNAmore Corp.
$ Copying for non-commercial usage allowed if
$ copy bears this notice completely.
$
$-------------------------------------------------------------------------------
$
$ Run file as is. It was tested with LS-DYNA R9.2 with double precision.
$ 
$-------------------------------------------------------------------------------
$# Units: kg / mm / ms / kN / GPa / kN-mm
$-------------------------------------------------------------------------------
$
*KEYWORD
*PARAMETER
$#   prmr1      val1     prmr2      val2     prmr3      val3     prmr4      val4
$
$--- Simulation time 
R     tEnd       5.0
$
$--- Pre-force in beams / Pre-stress in solids (cross sect 74.9859 mm^2)
R bltForce      28.8
R bltStrss    0.3841
$
$--- Loading of the connection
R    distX       5.0
$
*PARAMETER_EXPRESSION
$#   prmr1                                                           expression1
$
$--- Plot intervals
R   dtPlot       TEnd/100.0
R  dtAscii       TEnd/1000.0
$
$--- Load application times
R dtPreStr       TEnd/5.0
R    tLoad       TEnd/2.0
$
$--- Implicit time integration
R      dt0       dtPreStr/20.
R    dtMin       dtPreStr/30.
R    dtMax       dtPreStr/10.
R   tDyDth       dtPreStr*2./3.
R   tDyBur       dtPreStr
R   tDyBir       tLoad
$
$--- Infinity time
R   tInfty       tEnd*1.01
$
$ =============
$ INCLUDE cards
$ =============
$
$ Add submodels/ to include search path (tests *INCLUDE_PATH_RELATIVE)
*INCLUDE_PATH_RELATIVE
submodels
$
*INCLUDE
includes.k
$control_explicit.k
$control_implicit.k
$
*INCLUDE
$bolted_connection_a.k
$bolted_connection_b.k
$bolted_connection_c.k
$bolted_connection_d.k
$bolted_connection_d_penta.k
$
$ Resolved via INCLUDE_PATH_RELATIVE -> submodels/material_props.k
*INCLUDE
material_props.k
$
$ Intentionally missing - tests unresolved include warning
*INCLUDE
missing_geometry.k
$
$
$ =============
$ CONTROL cards
$ =============
$
*CONTROL_TERMINATION
$#  endtim    endcyc     dtmin    endeng    endmas     nosol     
     &tEnd                                                        
*CONTROL_TIMESTEP
$#  dtinit    tssfac      isdo    tslimt     dt2ms      lctm     erode     ms1st
                                                                                
$#  dt2msf   dt2mslc     imscl    unused    unused     rmscl     
                                                            
$
$
$ ==============
$ DATABASE cards
$ ==============
$
*DATABASE_ELOUT
$#      dt    binary      lcur     ioopt   option1   option2   option3   option4
&dtAscii                                                                       
*DATABASE_GLSTAT
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_BNDOUT
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_MATSUM
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_NODOUT
$#      dt    binary      lcur     ioopt   option1   option2       
&dtAscii                                                   
*DATABASE_RBDOUT
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_RCFORC
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_SLEOUT
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_SPCFORC
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_SECFORC
$#      dt    binary      lcur     ioopt     
&dtAscii                               
*DATABASE_SWFORC
$#      dt    binary      lcur     ioopt     
&dtAscii                               
$
$---
$
*DATABASE_FORMAT
$#   iform   ibinary       
                   1
*DATABASE_BINARY_D3PLOT
$#      dt      lcdt      beam     npltc    psetid      
&dtPlot                                          
*DATABASE_EXTENT_BINARY
$#   neiph     neips    maxint    strflg    sigflg    epsflg    rltflg    engflg
                                                                                
$#  cmpflg    ieverp    beamip     dcomp      shge     stssz    n3thdt   ialemat
                   1                                       3                    
$# nintsld   pkp_sen      sclp     hydro     msscl     therm    intout    nodout
                                                                                
$#    dtdt    resplt     neipb     quadr     cubic     
                   1                              
*END
