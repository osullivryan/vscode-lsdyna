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
$ Run main file as is. It was tested with LS-DYNA R9.2 with double precision.
$ 
$-------------------------------------------------------------------------------
$# Units: kg / mm / ms / kN / GPa / kN-mm
$-------------------------------------------------------------------------------
$
*KEYWORD
$
$
$---+----1----+----2----+----3----+----4----+----5----+----6----+----7----+----8
$
$ CONTROL cards - recommendations for explicit crash applications
$
$---+----1----+----2----+----3----+----4----+----5----+----6----+----7----+----8
$
*CONTROL_ACCURACY
$#     osu       inn    pidosu      iacc
                   4                   
*CONTROL_SOLUTION
$#    soln       nlq     isnan     lcint     
                             1      1001
*CONTROL_ENERGY
$#    hgen      rwen    slnten     rylen     
         2         2         2         2
*CONTROL_HOURGLASS
$#     ihq        qh  
         8       0.1
*CONTROL_BULK_VISCOSITY
$#      q1        q2      type     btype     
       1.5      0.06        -1          
*CONTROL_CONTACT
$#  slsfac    rwpnal    islchk    shlthk    penopt    thkchg     orien    enmass
       0.1       1.0         2                   1                              
$#  usrstr    usrfrc     nsbcs    interm     xpene     ssthk      ecdt   tiedprj
                                                                                
$#   sfric     dfric       edc       vfc        th     th_sf    pen_sf      
                                                                      
$#  ignore    frceng   skiprwg    outseg   spotstp   spotdel   spothin       
         2                             1         2         1          
$#    isym    nserod    rwgaps    rwgdth     rwksf      icov    swradf    ithoff
                             1                 1.0                              
$#  shledg    pstiff    ithcnt    tdcnof     ftall    unused    shltrw      
                                                                      
*CONTROL_RIGID
$#     lmf      jntf    orthmd     partm    sparse    metalf    plotel     rbsms
                                                                                
*CONTROL_SHELL
$#  wrpang     esort     irnxx    istupd    theory       bwc     miter      proj
      30.0         1                   1                                       1
$# rotascl    intgrd    lamsht    cstyp6    thshel      
                                                  
$# psstupd   sidt4tu     cntco    itsflg    irquad    w-mode   stretch      icrq
                                                                                
$#  nfail1    nfail4   psnfail    keepcs     delfr   drcpsid    drcprm   intperr
                   1                                               1.0          
*CONTROL_SOLID
$#   esort   fmatrix   niptets    swlocl    psfail   t10jtol    icohed    tet13k
         1                             1                                        
$#   pm1     pm2     pm3     pm4     pm5     pm6     pm7     pm8     pm9    pm10
                                                                                
*CONTROL_OUTPUT
$#   npopt    neecho    nrefup    iaccop     opifs    ipnint    ikedit    iflush
         1         3                   1                                        
$#   iprtf    ierode   tet10s8    msgmax    ipcurv      gmdt   ip1dblt      eocs
                   1               10000                                        
$#   tolev    newleg    frfreq     minfo    solsig    msgflg    cdetol      
                                                                      
*CONTROL_MPP_IO_NODUMP
$
$
$---+----1----+----2----+----3----+----4----+----5----+----6----+----7----+----8
$
$ CONTACT cards
$
$---+----1----+----2----+----3----+----4----+----5----+----6----+----7----+----8
$
*CONTACT_AUTOMATIC_SINGLE_SURFACE_ID
$#     cid                                                                 title
     10001 Global Contact
$
$#    ssid      msid     sstyp     mstyp    sboxid    mboxid       spr       mpr
     10001                   2                                                  
$#      fs        fd        dc        vc       vdc    penchk        bt        dt
      0.15       0.1       1.0                20.0                              
$#     sfs       sfm       sst       mst      sfst      sfmt       fsf       vsf
                                                                                
$#    soft    sofscl    lcidab    maxpar     sbopt     depth     bsort    frcfrq
         1                                                                     1
$#  penmax    thkopt    shlthk     snlog      isym     i2d3d    sldthk    sldstf
                                                                                
$#    igap    ignodprfac/mpadtstif/mpar2   unused     unused    flangl   cid_rcf
                   2              0.7e-3                                        
$#   q2tri    dtpchk     sfnbr    fnlscl   dnlscl       tcso    tiedid    shledg
                                                                                
$#  sharec    cparm8    ipback     srnde    fricsf      icor     ftorq    region
                                                                                
$#  pstiff   ignroff   beam-cs       
                              
$
$---
$
*CONTACT_FORCE_TRANSDUCER_PENALTY_ID
$#     cid                                                                 title
         2 Contact Force Between Sheets
$
$#    ssid      msid     sstyp     mstyp    sboxid    mboxid       spr       mpr
        10        20         3         3                                        
$#      fs        fd        dc        vc       vdc    penchk        bt        dt
                                                                                
$#     sfs       sfm       sst       mst      sfst      sfmt       fsf       vsf
                                                                                
$
$---
$
*CONTACT_AUTOMATIC_GENERAL_MPP_ID
$#     cid                                                                 title
     10013 Beam Contact
$#  ignore      bckt    lcbckt    ns2trk   inititr    parmax              cparm8
                                                                               2
$#    ssid      msid     sstyp     mstyp    sboxid    mboxid       spr       mpr
     10013                   2                                                  
$#      fs        fd        dc        vc       vdc    penchk        bt        dt
      0.15       0.1       1.0                20.0                              
$#     sfs       sfm       sst       mst      sfst      sfmt       fsf       vsf
                                                                                
$#    soft    sofscl    lcidab    maxpar     sbopt     depth     bsort    frcfrq
         1                                                                     1
$#  penmax    thkopt    shlthk     snlog      isym     i2d3d    sldthk    sldstf
                                                                                
$#    igap    ignodprfac/mpadtstif/mpar2   unused     unused    flangl   cid_rcf
                   2              0.7e-3                                        
$#   q2tri    dtpchk     sfnbr    fnlscl   dnlscl       tcso    tiedid    shledg
                                                                                
$#  sharec    cparm8    ipback     srnde    fricsf      icor     ftorq    region
                                                                                
$#  pstiff   ignroff   beam-cs       
                              
*END
