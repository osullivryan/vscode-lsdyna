$KEYWORD
$
$ Prescribed motion loading curves
$ Resolved via forward relative path from includes.k: submodels/loading/prescribed_motion.k
$
*INCLUDE
../material_props.k
$
*PARAMETER
$#   prmr1      val1
R   velAmp      10.0

*PARAMETER_EXPRESSION
$#   prmr1                                                           expression1
R   tRamp       tLoad/10.0
R  velPeak      velAmp*1.5

*DEFINE_CURVE
$#    lcid      sidr       sfa       sfo      offa      offo    dattyp      lcint
      1001
$#                a1                  o1
               0.000               0.000
             &tRamp               1.000
              &tLoad             &velPeak
              &tInfty            &velPeak
$
*BOUNDARY_PRESCRIBED_MOTION_SET
$#    nsid       dof       vad      lcid        sf       vid     death      birth
         2         1         0      1001   &velAmp
$
*END
